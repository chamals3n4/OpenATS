import { cleanCvText } from "./clean";
import { detectFileType, type CvFileType } from "./detect";
import { extractPdfText } from "./extract-pdf";
import { normalizeForSearch } from "./normalize-search";
import { hasUsableText } from "./quality";

/**
 * Raise this when a change here would give a different result for the same file, then run
 * `pnpm tsx src/db/backfill-cv-text.ts` so CVs read earlier are read again.
 */
export const EXTRACTOR_VERSION = 1;

/** A file that will fail the same way every time, so there is no point in trying it again. */
export class UnreadableCvError extends Error {}

export interface ExtractedCv {
  /** `empty`: the file was read, but holds no usable text (a scan, or an image-only CV). */
  status: "done" | "empty";
  fileType: CvFileType;
  method: "text";
  text: string;
  searchText: string;
  pageCount: number;
}

/** Reads the text of a CV. Nothing leaves the server. */
export async function extractCvText(file: Buffer): Promise<ExtractedCv> {
  const fileType = detectFileType(file);
  if (fileType !== "pdf") {
    throw new UnreadableCvError(
      fileType === "docx" ? "Word files are not supported yet" : "The file is not a PDF",
    );
  }

  let extracted: { text: string; pageCount: number };
  try {
    extracted = await extractPdfText(file);
  } catch (error) {
    // PDF.js names its errors: a password-protected or damaged file will never parse.
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") throw new UnreadableCvError("The PDF is password protected");
    if (name === "InvalidPDFException") throw new UnreadableCvError("The PDF is damaged");
    throw error;
  }

  const text = cleanCvText(extracted.text);
  if (!hasUsableText(text, extracted.pageCount)) {
    return { status: "empty", fileType, method: "text", text: "", searchText: "", pageCount: extracted.pageCount };
  }

  return {
    status: "done",
    fileType,
    method: "text",
    text,
    searchText: normalizeForSearch(text),
    pageCount: extracted.pageCount,
  };
}
