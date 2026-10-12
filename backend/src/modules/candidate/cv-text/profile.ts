import { extractContacts, type CvContacts } from "./contacts";
import { highestEducationLevel, type EducationLevel } from "./education";
import { estimateExperienceYears } from "./experience";
import { splitSections, type CvSection } from "./sections";

/**
 * What can be read out of a CV's text by rules that hold in any line of work. Job titles, employer
 * names and a list of skills are deliberately not here: no rule gets them right across layouts,
 * and a wrong value in a field reads as a fact.
 */
export interface CvProfile {
  sections: CvSection[];
  /** An estimate; null when it could not be worked out. */
  experienceYears: number | null;
  /** An estimate; null when it could not be worked out. */
  educationLevel: EducationLevel | null;
  contacts: CvContacts;
}

/**
 * Built from the cleaned text alone, so it can be worked out again for every stored CV without
 * reading the files a second time (`pnpm tsx src/db/backfill-cv-text.ts --reparse`).
 */
export function buildCvProfile(text: string, today: Date = new Date()): CvProfile {
  const sections = splitSections(text);
  return {
    sections,
    experienceYears: estimateExperienceYears(sections, today),
    educationLevel: highestEducationLevel(sections),
    contacts: extractContacts(text, sections),
  };
}
