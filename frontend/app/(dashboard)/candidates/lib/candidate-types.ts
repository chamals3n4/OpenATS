import type { Candidate } from "@/types";

export type CandidateStatusFilter =
  | "all"
  | "active"
  | "rejected"
  | "offered"
  | "hired"
  | "withdrawn";

export interface CandidateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeFile: File | null;
}

export interface EditCandidateState {
  target: Candidate | null;
  formData: CandidateFormData;
}

export function createEmptyFormData(): CandidateFormData {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    resumeFile: null,
  };
}

export function candidateToFormData(candidate: Candidate): CandidateFormData {
  return {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone ?? "",
    resumeFile: null,
  };
}

export function buildUpdateFormData(formData: CandidateFormData): FormData {
  const fd = new FormData();
  fd.append("firstName", formData.firstName.trim());
  fd.append("lastName", formData.lastName.trim());
  fd.append("email", formData.email.trim());
  fd.append("phone", formData.phone.trim());

  if (formData.resumeFile) {
    fd.append("resume", formData.resumeFile);
  }

  return fd;
}
