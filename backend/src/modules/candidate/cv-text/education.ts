import type { CvSection } from "./sections";

export type EducationLevel = "secondary" | "diploma" | "bachelor" | "master" | "doctorate";

/**
 * Highest first. Words are matched in any case; abbreviations only as written ("BA", not "ba"),
 * and the ones that are also ordinary words or places ("MA", "MS") only with their dots.
 */
const LEVELS: [EducationLevel, RegExp[]][] = [
  ["doctorate", [/\b(ph\.?\s?d|d\.?phil|doctorate|doctoral|doctor of \p{L}+)\b/iu]],
  [
    "master",
    [/\b(master'?s?|magister|postgraduate degree)\b/i, /\b(MSc|M\.Sc|MBA|MEng|M\.Eng|MPhil|M\.Phil|MEd|M\.Ed|LLM|MTech|M\.Tech|MCA|M\.A\.|M\.S\.)(?![\p{L}])/u],
  ],
  [
    "bachelor",
    [
      /\b(bachelor'?s?|undergraduate degree|honou?rs degree)\b/i,
      /\b(BSc|B\.Sc|BA|B\.A|BS|B\.S|BEng|B\.Eng|BTech|B\.Tech|BBA|BCom|B\.Com|LLB|MBBS|BDS|BEd|B\.Ed|BIT|BCS|BCA|BBM|BN|BPharm)(?![\p{L}])/u,
    ],
  ],
  ["diploma", [/\b(diploma|associate'?s? degree|foundation degree|advanced certificate)\b/i, /\b(HND|HNC|NVQ)\b/]],
  [
    "secondary",
    [
      /\b(high school|secondary school|a-?levels?|o-?levels?|advanced level|ordinary level|matriculation|grade 12)\b/i,
      /\b(G\.?C\.?E|GCSE|HSC|SSC)\b/,
      /\b[AO]\/L\b/,
    ],
  ],
];

/**
 * The highest level of education named in the Education section, or null when there is no such
 * section or nothing in it is recognised. A course still in progress counts the same as a finished
 * one, so this too is an estimate.
 */
export function highestEducationLevel(sections: CvSection[]): EducationLevel | null {
  const text = sections
    .filter((section) => section.key === "education")
    .map((section) => section.text)
    .join("\n");
  if (!text) return null;

  return LEVELS.find(([, patterns]) => patterns.some((pattern) => pattern.test(text)))?.[0] ?? null;
}
