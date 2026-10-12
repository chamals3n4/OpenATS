import type { CvSection } from "./sections";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const YEAR = "(?:19|20)\\d{2}";
// "March 2021", "Mar. 2021", "03/2021", or a year on its own.
const DATE = `(?:${MONTH}\\.?,?\\s+${YEAR}|(?:0?[1-9]|1[0-2])[/.]${YEAR}|${YEAR})`;
// "to date" and "till date" arrive here as "date": the first word is read as the separator.
const NOW = "(?:present|current|currently|now|today|ongoing|date)";
const RANGE = new RegExp(
  `(?<![\\d/.])(${DATE})\\s*(?:-|\\u2013|\\u2014|to|until|till|through)\\s*(${DATE}|${NOW})(?![\\d/])`,
  "gi",
);

/** A date as a count of months, and whether the CV gave the month or only the year. */
function parseDate(raw: string): { month: number; hasMonth: boolean } | null {
  const year = Number(raw.match(/(?:19|20)\d{2}/)?.[0]);
  if (!year) return null;

  const named = MONTHS.findIndex((name) => raw.toLowerCase().startsWith(name));
  if (named >= 0) return { month: year * 12 + named, hasMonth: true };

  const numbered = raw.match(/^(\d{1,2})[/.]/);
  if (numbered) return { month: year * 12 + Number(numbered[1]) - 1, hasMonth: true };

  return { month: year * 12, hasMonth: false };
}

/**
 * Roughly how many years the candidate has worked, from the date ranges in the Experience section
 * ("2019 - 2023", "Jan 2021 - Present"). Jobs held at the same time are counted once.
 *
 * It is an estimate and is always shown as one: it cannot see a job listed without dates, and a CV
 * that gives only years is rounded to whole years. Null means it could not be worked out, which is
 * different from zero.
 */
export function estimateExperienceYears(sections: CvSection[], today: Date = new Date()): number | null {
  const now = today.getFullYear() * 12 + today.getMonth();
  const spans: [number, number][] = [];

  for (const section of sections) {
    if (section.key !== "experience") continue;

    for (const match of section.text.matchAll(RANGE)) {
      const start = parseDate(match[1] ?? "");
      if (!start || start.month > now || start.month < 1950 * 12) continue;

      const endText = match[2] ?? "";
      const end = /^\d|^[a-z]{3,9}\.?,?\s+\d/i.test(endText) ? parseDate(endText) : null;
      // The end is the month after the last one worked. "2019 - 2023" given in years only is taken
      // as four years, and "Jan 2021 - Mar 2021" as three months.
      let until = end ? end.month + (end.hasMonth ? 1 : 0) : now + 1;
      until = Math.min(until, now + 1);
      if (until < start.month) continue;
      // The same year twice ("2020 - 2020") is some part of a year.
      if (until === start.month) until = start.month + 6;

      spans.push([start.month, until]);
    }
  }

  if (spans.length === 0) return null;

  spans.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let coveredTo = -Infinity;
  for (const [start, end] of spans) {
    if (end <= coveredTo) continue;
    months += end - Math.max(start, coveredTo);
    coveredTo = end;
  }

  const years = Math.round((months / 12) * 10) / 10;
  // Nobody has worked for longer than this; a larger figure is a misread date.
  return years > 60 ? null : years;
}
