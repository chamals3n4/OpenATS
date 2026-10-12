import type { CvSection } from "./sections";

export interface CvContacts {
  emails: string[];
  phones: string[];
  links: string[];
}

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const LINK = /(?:https?:\/\/|www\.)[^\s<>()]+|(?:linkedin\.com|github\.com|gitlab\.com|behance\.net)\/[^\s<>()]+/gi;
const PHONE = /(?:\+|00)?\d[\d\s().-]{7,18}\d/g;

const unique = (values: string[]) => [...new Set(values)].slice(0, 5);

/**
 * The email addresses, phone numbers and links written in the CV. Phone numbers are only taken
 * from the top of the CV: further down, a run of digits is far more often a date range or a
 * registration number than a phone.
 */
export function extractContacts(text: string, sections: CvSection[]): CvContacts {
  const header = sections[0]?.key === "header" ? sections[0].text : "";
  const top = header.length >= 40 ? header : text.slice(0, 600);

  const phones = (top.match(PHONE) ?? [])
    .map((phone) => phone.trim())
    .filter((phone) => {
      const digits = phone.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 15;
    });

  return {
    emails: unique((text.match(EMAIL) ?? []).map((email) => email.toLowerCase())),
    phones: unique(phones),
    links: unique((text.match(LINK) ?? []).map((link) => link.replace(/[.,;]+$/, ""))),
  };
}
