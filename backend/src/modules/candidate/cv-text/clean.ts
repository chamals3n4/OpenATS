/** Longest text kept for one CV. Far beyond any real CV, it only stops a hostile file. */
export const MAX_CV_CHARS = 500_000;

const BULLETS = /^[ ]*[•●▪■□◦‣∙·○◆◇➢➤►▶✓✔❖*][ ]+/gmu;

/**
 * Turns the raw text of a file into text that reads well and searches well. Every step fixes
 * something PDF and Word files really do: ligatures, invisible characters, words split across
 * lines, headings typed with a space between every letter.
 */
export function cleanCvText(raw: string): string {
  let text = raw.slice(0, MAX_CV_CHARS * 2);

  // NFKC folds ligatures ("ﬁ" to "fi"), full-width letters and non-breaking spaces.
  text = text.normalize("NFKC");

  text = text.replace(/\r\n?/g, "\n").replace(/[\t\f\v]/g, " ");
  // Postgres refuses a NUL in text; the rest are invisible and only break matching.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, "");
  // Soft hyphens, zero-width characters, byte order marks and direction marks.
  text = text.replace(/[\u00AD\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060\uFEFF]/g, "");

  // "experi-" at the end of one line and "ence" at the start of the next is one word.
  text = text.replace(/(\p{L})-\n[ ]*(\p{Ll})/gu, "$1$2");

  // "E X P E R I E N C E" is one word. A wider gap between the letters separates two words.
  text = text.replace(/(?<![\p{L}\p{N}])(?:\p{L} ){3,}\p{L}(?![\p{L}\p{N}])/gu, (spaced) =>
    spaced.replace(/ /g, ""),
  );

  text = text.replace(BULLETS, "- ");

  text = text
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.slice(0, MAX_CV_CHARS);
}
