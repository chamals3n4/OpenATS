import { describe, expect, it } from "vitest";
import { extractContacts } from "../../src/modules/candidate/cv-text/contacts";
import { highestEducationLevel } from "../../src/modules/candidate/cv-text/education";
import { estimateExperienceYears } from "../../src/modules/candidate/cv-text/experience";
import { buildCvProfile } from "../../src/modules/candidate/cv-text/profile";
import { headingKey, splitSections, type CvSection } from "../../src/modules/candidate/cv-text/sections";

const TODAY = new Date("2026-10-12T00:00:00Z");

const experience = (text: string): CvSection[] => [{ key: "experience", heading: "Experience", text }];
const education = (text: string): CvSection[] => [{ key: "education", heading: "Education", text }];
const years = (text: string) => estimateExperienceYears(experience(text), TODAY);

const NURSE_CV = `Nimal Fernando
Registered Nurse
nimal.fernando@example.com | +94 77 123 4567 | linkedin.com/in/nimalf
Kandy, Sri Lanka

PROFILE
Registered nurse with experience in intensive care and emergency wards.

WORK EXPERIENCE
Senior Staff Nurse, Kandy General Hospital
March 2019 - Present
- Triage and ventilator management in a 12 bed ICU.
Staff Nurse, Peradeniya Teaching Hospital
Jan 2016 - Feb 2019
- Wound care and medication rounds.

EDUCATION
Diploma in Nursing, National School of Nursing, 2012 - 2015
G.C.E. Advanced Level, 2011

LICENSES & CERTIFICATIONS
Sri Lanka Nursing Council registration 45821
Basic Life Support, 2023

LANGUAGES
Sinhala, English, Tamil

REFEREES
Available on request.`;

const WELDER_CV = `SUNIL PERERA
Welder / Fabricator
Tel: 0712345678

Career Objective
A site role where I can use my structural welding skills.

Employment History
Welder - Lanka Steel Works        2012 - 2020
Fabricator - Colombo Dockyard     2018 - 2024

Skills
MIG, TIG and arc welding. Blueprint reading. Forklift licence.

Qualifications
NVQ Level 4 in Welding, Vocational Training Authority

Interests
Cricket, fishing`;

describe("headingKey", () => {
  it("recognises the headings every line of work uses, however they are written", () => {
    expect(headingKey("WORK EXPERIENCE")).toBe("experience");
    expect(headingKey("Professional Experience:")).toBe("experience");
    expect(headingKey("Clinical Experience")).toBe("experience");
    expect(headingKey("Employment History")).toBe("experience");
    expect(headingKey("Education")).toBe("education");
    expect(headingKey("Academic Qualifications")).toBe("education");
    expect(headingKey("Education & Training")).toBe("education");
    expect(headingKey("Key Skills")).toBe("skills");
    expect(headingKey("Core Competencies")).toBe("skills");
    expect(headingKey("Programming Languages")).toBe("skills");
    expect(headingKey("Languages")).toBe("languages");
    expect(headingKey("Licenses & Certifications")).toBe("certifications");
    expect(headingKey("Professional Summary")).toBe("summary");
    expect(headingKey("Career Objective")).toBe("summary");
    expect(headingKey("Referees")).toBe("references");
    expect(headingKey("Awards and Achievements")).toBe("other");
  });

  it("does not take an ordinary line for a heading", () => {
    expect(headingKey("Work experience in hospitals and clinics")).toBeNull();
    expect(headingKey("- Customer service experience")).toBeNull();
    expect(headingKey("5 years experience")).toBeNull();
    expect(headingKey("Gained experience in audit.")).toBeNull();
    expect(headingKey("Senior Staff Nurse")).toBeNull();
    expect(headingKey("managed a team with education projects")).toBeNull();
    expect(headingKey("")).toBeNull();
  });
});

describe("splitSections", () => {
  it("splits a CV into its sections and loses none of the text", () => {
    const sections = splitSections(NURSE_CV);

    expect(sections.map((s) => s.key)).toEqual([
      "header",
      "summary",
      "experience",
      "education",
      "certifications",
      "languages",
      "references",
    ]);
    expect(sections[0]?.text).toContain("nimal.fernando@example.com");
    expect(sections[2]?.heading).toBe("WORK EXPERIENCE");
    expect(sections[2]?.text).toContain("Peradeniya Teaching Hospital");
    expect(sections[2]?.text).not.toContain("Diploma in Nursing");

    const rebuilt = sections.map((s) => [s.heading, s.text].filter(Boolean).join("\n")).join("\n");
    expect(rebuilt.replace(/\s+/g, " ")).toBe(NURSE_CV.replace(/\s+/g, " "));
  });

  it("puts a CV with no headings in one section", () => {
    expect(splitSections("Just a paragraph about me.\nAnd another line.")).toEqual([
      { key: "header", heading: null, text: "Just a paragraph about me.\nAnd another line." },
    ]);
  });
});

describe("estimateExperienceYears", () => {
  it("reads the usual ways of writing a date range", () => {
    expect(years("2019 - 2023")).toBe(4);
    expect(years("2019 – 2023")).toBe(4);
    expect(years("2019 to 2023")).toBe(4);
    expect(years("Jan 2021 - Mar 2021")).toBe(0.3);
    expect(years("January 2020 - December 2021")).toBe(2);
    expect(years("03/2018 - 02/2020")).toBe(2);
    expect(years("Sept. 2022 until Aug 2023")).toBe(1);
  });

  it("counts up to today for a job still held", () => {
    expect(years("Oct 2024 - Present")).toBe(2.1);
    expect(years("2020 - current")).toBe(6.8);
    expect(years("June 2025 to date")).toBe(1.4);
    expect(years("June 2026 till date")).toBe(0.4);
  });

  it("counts jobs held at the same time once", () => {
    expect(years("Welder 2012 - 2020\nFabricator 2018 - 2024")).toBe(12);
    expect(years("2015 - 2017\n2019 - 2021")).toBe(4);
  });

  it("gives no figure when it cannot work one out, rather than zero", () => {
    expect(years("Staff Nurse at Kandy General Hospital")).toBeNull();
    expect(years("Registration number 2019 4521")).toBeNull();
    expect(estimateExperienceYears([], TODAY)).toBeNull();
    // Dates in the Education section are not work.
    expect(estimateExperienceYears(education("BSc 2012 - 2016"), TODAY)).toBeNull();
  });

  it("ignores dates that cannot be right", () => {
    expect(years("2031 - 2035")).toBeNull();
    expect(years("2023 - 2019")).toBeNull();
    expect(years("2024 - 2030")).toBe(2.8);
    expect(years("Tel 2019-2023456")).toBeNull();
  });
});

describe("highestEducationLevel", () => {
  const level = (text: string) => highestEducationLevel(education(text));

  it("finds the highest level named", () => {
    expect(level("PhD in Chemistry\nBSc in Chemistry")).toBe("doctorate");
    expect(level("Master of Business Administration")).toBe("master");
    expect(level("MBA, University of Colombo\nBSc (Hons) Accounting")).toBe("master");
    expect(level("Bachelor of Laws")).toBe("bachelor");
    expect(level("MBBS, University of Peradeniya")).toBe("bachelor");
    expect(level("BA in English")).toBe("bachelor");
    expect(level("Higher National Diploma in Engineering")).toBe("diploma");
    expect(level("NVQ Level 4 in Welding")).toBe("diploma");
    expect(level("G.C.E. Advanced Level, 2011")).toBe("secondary");
    expect(level("Passed A/L in the science stream")).toBe("secondary");
  });

  it("does not read ordinary words and places as degrees", () => {
    expect(level("Boston, MA")).toBeNull();
    expect(level("Proficient in MS Office")).toBeNull();
    expect(level("A basic course, a banking seminar")).toBeNull();
  });

  it("gives no level without an Education section", () => {
    expect(highestEducationLevel(experience("Taught BSc students"))).toBeNull();
    expect(highestEducationLevel([])).toBeNull();
  });
});

describe("extractContacts", () => {
  it("finds emails, phones and links", () => {
    const contacts = extractContacts(NURSE_CV, splitSections(NURSE_CV));
    expect(contacts.emails).toEqual(["nimal.fernando@example.com"]);
    expect(contacts.phones).toEqual(["+94 77 123 4567"]);
    expect(contacts.links).toEqual(["linkedin.com/in/nimalf"]);
  });

  it("does not take dates and registration numbers further down for phone numbers", () => {
    const contacts = extractContacts(WELDER_CV, splitSections(WELDER_CV));
    expect(contacts.phones).toEqual(["0712345678"]);
    expect(extractContacts(NURSE_CV, splitSections(NURSE_CV)).phones).not.toContain("45821");
  });
});

describe("buildCvProfile", () => {
  it("reads a nurse's CV", () => {
    const profile = buildCvProfile(NURSE_CV, TODAY);
    // Jan 2016 to today, with no gap between the two jobs.
    expect(profile.experienceYears).toBe(10.8);
    expect(profile.educationLevel).toBe("diploma");
  });

  it("reads a welder's CV laid out quite differently", () => {
    const profile = buildCvProfile(WELDER_CV, TODAY);
    expect(profile.sections.map((s) => s.key)).toEqual([
      "header",
      "summary",
      "experience",
      "skills",
      "education",
      "other",
    ]);
    expect(profile.experienceYears).toBe(12);
    expect(profile.educationLevel).toBe("diploma");
  });

  it("leaves the estimates empty for a CV it cannot read them from", () => {
    const profile = buildCvProfile("I have worked in many shops and I am a fast learner.", TODAY);
    expect(profile.experienceYears).toBeNull();
    expect(profile.educationLevel).toBeNull();
    expect(profile.contacts).toEqual({ emails: [], phones: [], links: [] });
  });
});
