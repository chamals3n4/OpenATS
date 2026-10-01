import { describe, it, expect } from "vitest";
import { groupAnswers, isAnswered } from "@/app/(dashboard)/candidates/[id]/lib/answer-utils";
import type { CandidateDetail } from "@/types";

type A = CandidateDetail["answers"][number];
type S = CandidateDetail["selections"][number];

const answer = (over: Partial<A>): A =>
  ({ id: 1, candidateId: 1, questionId: 1, answerText: "x", createdAt: "", ...over }) as A;
const selection = (over: Partial<S>): S =>
  ({ id: 1, candidateId: 1, questionId: 1, optionId: 1, createdAt: "", ...over }) as S;

describe("groupAnswers", () => {
  it("puts written and chosen answers into one list, in form order", () => {
    const items = groupAnswers(
      [
        answer({ id: 1, questionId: 30, questionTitle: "Why us?", questionPosition: 3, answerText: "Mission" }),
        answer({ id: 2, questionId: 10, questionTitle: "Years of experience?", questionPosition: 1, answerText: "5" }),
      ],
      [selection({ id: 1, questionId: 20, questionTitle: "Preferred stack", questionPosition: 2, optionId: 7, optionLabel: "React" })],
    );
    expect(items.map((i) => i.title)).toEqual(["Years of experience?", "Preferred stack", "Why us?"]);
  });

  it("collects several chosen options under their one question", () => {
    const items = groupAnswers([], [
      selection({ id: 1, questionId: 5, questionTitle: "Stack", optionId: 1, optionLabel: "React" }),
      selection({ id: 2, questionId: 5, questionTitle: "Stack", optionId: 2, optionLabel: "Node" }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].options.map((o) => o.label)).toEqual(["React", "Node"]);
  });

  it("falls back to the question id when older responses carry no position", () => {
    const items = groupAnswers(
      [answer({ questionId: 9, answerText: "b" }), answer({ id: 2, questionId: 3, answerText: "a" })],
      [],
    );
    expect(items.map((i) => i.questionId)).toEqual([3, 9]);
  });

  it("names untitled questions and unlabeled options", () => {
    const items = groupAnswers(
      [answer({ questionId: 7, questionTitle: null })],
      [selection({ questionId: 8, questionTitle: " ", optionId: 4, optionLabel: null })],
    );
    expect(items[0].title).toBe("Question #7");
    expect(items[1].title).toBe("Question #8");
    expect(items[1].options[0].label).toBe("Option #4");
  });

  it("treats a blank written answer as no answer", () => {
    const [item] = groupAnswers([answer({ answerText: "   " })], []);
    expect(item.text).toBeNull();
    expect(isAnswered(item)).toBe(false);
  });

  it("is empty with nothing to show", () => {
    expect(groupAnswers([], [])).toEqual([]);
  });
});
