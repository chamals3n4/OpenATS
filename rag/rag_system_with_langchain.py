import argparse
import json
import os
import re
import tempfile
from pathlib import Path

from langchain_chroma import Chroma
from langchain_classic.chains import RetrievalQA
from langchain_community.document_loaders import UnstructuredFileLoader
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import CharacterTextSplitter


def build_retriever(pdf_path: Path):
    embedding = HuggingFaceEmbeddings()
    loader = UnstructuredFileLoader(str(pdf_path))
    documents = loader.load()

    text_splitter = CharacterTextSplitter(chunk_size=1800, chunk_overlap=350)
    chunks = text_splitter.split_documents(documents)

    persist_dir = tempfile.mkdtemp(prefix="openats_rag_")
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embedding,
        persist_directory=persist_dir,
        collection_name="candidate_cv",
    )
    return vector_store.as_retriever(search_kwargs={"k": 6})


def chain_text_from_response(response: object) -> str:
    if isinstance(response, str):
        return response.strip()
    if isinstance(response, dict):
        for key in ("result", "answer", "output", "text"):
            val = response.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        for v in response.values():
            if isinstance(v, str) and v.strip():
                return v.strip()
    return ""


def _strip_markdown_fences(text: str) -> str:
    t = text.strip()
    m = re.match(
        r"^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$",
        t,
        re.IGNORECASE,
    )
    if m:
        return m.group(1).strip()
    if t.startswith("```"):
        lines = t.splitlines()
        if len(lines) >= 2 and lines[0].startswith("```"):
            inner = "\n".join(lines[1:])
            if inner.rstrip().endswith("```"):
                inner = inner[: inner.rfind("```")].rstrip()
            return inner.strip()
    return t


def extract_first_json_array(s: str) -> str | None:
    start = s.find("[")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(s)):
        c = s[i]
        if in_string:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == '"':
                in_string = False
            continue
        if c == '"':
            in_string = True
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def parse_questions_json(raw: str) -> list:
    if not raw or not raw.strip():
        raise ValueError("empty model output")

    candidates_to_try: list[str] = []
    stripped = _strip_markdown_fences(raw)
    candidates_to_try.append(stripped)
    if stripped != raw:
        candidates_to_try.append(raw.strip())

    extracted = extract_first_json_array(stripped)
    if extracted:
        candidates_to_try.append(extracted)

    last_err: Exception | None = None
    for candidate in candidates_to_try:
        if not candidate:
            continue
        try:
            data = json.loads(candidate)
            if isinstance(data, list):
                return data
            raise ValueError("parsed JSON is not an array")
        except (json.JSONDecodeError, ValueError) as e:
            last_err = e
            continue

    raise ValueError(f"could not parse JSON array: {last_err}")


def generate_questions(pdf_path: Path, count: int):
    if not os.getenv("GROQ_API_KEY"):
        raise RuntimeError("GROQ_API_KEY is not set")

    retriever = build_retriever(pdf_path)

    prompt = f"""
You are creating a technical screening assessment from a candidate CV.

Generate EXACTLY {count} complex, problem-solving questions grounded in projects/experience visible in the CV context.
Do NOT ask direct trivia. Use scenario-based, debugging, architecture, trade-off, failure-analysis styles.

Question type rules:
- Mix question types across:
  - multiple_choice
  - true_false
  - short_answer
- At least 1 short_answer and at least 2 objective questions.
- For true_false, output two options only: "True", "False".
- For short_answer, include gradingRubric describing what a strong answer must contain.

Output ONLY valid JSON array with this shape (no markdown fences, no commentary before or after):
[
  {{
    "question": "string",
    "questionType": "multiple_choice|true_false|short_answer",
    "options": [{{"label":"string","isCorrect":true|false}}],
    "gradingRubric": "string"
  }}
]

For short_answer questions:
- options must be []
- gradingRubric must be non-empty.

For objective questions:
- include 4 options for multiple_choice, 2 options for true_false.
- exactly one option must be marked isCorrect=true.
"""

    temperatures = (0.2, 0.35)
    last_failure: str = ""

    for attempt, temperature in enumerate(temperatures):
        llm = ChatGroq(model="llama-3.1-8b-instant", temperature=temperature)
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            return_source_documents=False,
        )

        response = qa_chain.invoke({"query": prompt})
        raw = chain_text_from_response(response)

        if not raw:
            preview = repr(response)
            if len(preview) > 800:
                preview = preview[:800] + "..."
            last_failure = f"empty chain output; response={preview}"
            if attempt < len(temperatures) - 1:
                continue
            raise RuntimeError(
                f"RAG LLM returned empty text after {len(temperatures)} attempts. "
                f"Check GROQ_API_KEY, Groq rate limits, and model availability. {last_failure}"
            )

        try:
            return parse_questions_json(raw)
        except (ValueError, json.JSONDecodeError) as e:
            last_failure = f"{e!s}; raw_prefix={raw[:400]!r}"
            if attempt < len(temperatures) - 1:
                continue
            raise RuntimeError(
                f"RAG could not parse model output as JSON array after {len(temperatures)} attempts. "
                f"Check Groq output format. {last_failure}"
            ) from e

    raise RuntimeError("RAG question generation failed unexpectedly")


def main():
    parser = argparse.ArgumentParser(
        description="Generate CV-based assessment questions using RAG"
    )
    parser.add_argument("--resume", required=True, help="Absolute path to candidate PDF")
    parser.add_argument("--count", type=int, default=5, help="Question count")
    args = parser.parse_args()

    pdf_path = Path(args.resume)
    if not pdf_path.exists():
        raise FileNotFoundError(f"Resume file not found: {pdf_path}")

    questions = generate_questions(pdf_path, args.count)
    print(json.dumps(questions, ensure_ascii=True))


if __name__ == "__main__":
    main()
