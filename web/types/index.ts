export type Job = {
  id: number;
  slug: string;
  title: string;
  departmentId: number;
  employmentType:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship"
    | "freelance";
  location: string | null;
  description: string | null;
  salaryType: "fixed" | "range" | null;
  currency: string | null;
  payFrequency: string | null;
  salaryFixed: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  status: "draft" | "inactive" | "published" | "closed" | "archived";
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  skills: string[];
};

export type PipelineStage = {
  id: number;
  jobId: number;
  name: string;
  position: number;
  stageType: "screening" | "interview" | "offer";
  sourceTemplateId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type JobDetail = Job & {
  pipelineStages: PipelineStage[];
  hiringTeam: { id: number; jobId: number; userId: number; addedAt: string }[];
};

export type CurrentUser = {
  id: number;
  asgardeoUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: "super_admin" | "hiring_manager" | "interviewer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomQuestion = {
  id: number;
  jobId: number;
  title: string;
  questionType: "short_answer" | "long_answer" | "checkbox" | "radio";
  isRequired: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  options: {
    id: number;
    questionId: number;
    label: string;
    isCorrect: boolean;
    position: number;
  }[];
};

export type ChatMessage = {
  id: number;
  message: string | null;
  senderId: number;
  sentAt: string;
  isSystemMessage: boolean;
  senderName: string | null;
  senderAvatar: string | null;
};

export type Department = {
  id: number;
  name: string;
  companyId: number;
  createdAt: string;
  updatedAt: string;
};

export type Company = {
  id: number;
  name: string;
  email: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssessmentOption = {
  id: number;
  questionId: number;
  label: string;
  isCorrect: boolean;
  position: number;
};

export type AssessmentQuestion = {
  id: number;
  assessmentId: number;
  title: string;
  description: string;
  questionType: "short_answer" | "multiple_choice";
  points: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  options?: AssessmentOption[];
};

export type Assessment = {
  id: number;
  title: string;
  description: string | null;
  timeLimit: number;
  passScore: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  questions?: AssessmentQuestion[];
};

export type CandidateRejection = {
  id: number;
  candidateId: number;
  jobId: number;
  fromStageId: number | null;
  rejectedBy: number | null;
  reason: string | null;
  templateId: number | null;
  emailStatus: "not_sent" | "draft" | "sent";
  sentAt: string | null;
  rejectedAt: string;
};

export type CandidateInterview = {
  id: number;
  candidateId: number;
  stageId: number;
  jobId: number;
  scheduledAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  outcome: "pending" | "pass" | "fail";
  createdBy: number | null;
  createdAt: string;
};

export type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  jobId: number;
  currentStageId: number | null;
  status: "active" | "rejected" | "offered" | "hired" | "withdrawn";
  appliedAt: string;
  updatedAt: string;
  stageName: string | null;
  jobTitle: string | null;
};

/** Mirrors API `stageAutomation` on candidate stage move. */
export type StageAutomationFlags = {
  assessmentInvite?: "sent" | "skipped_active_invite";
};

export type CandidateCvAnalysisPayload = {
  status: "pending" | "done" | "failed";
  matchScore: number | null;
  matchedSkills: string[] | null;
  missingSkills: string[] | null;
  scoreBreakdown: {
    skills: number;
    experience: number;
    level: number;
    certs: number;
  } | null;
  errorMessage: string | null;
  updatedAt: string;
};

export type CandidateDetail = Candidate & {
  cvAnalysis: CandidateCvAnalysisPayload | null;
  answers: {
    id: number;
    candidateId: number;
    questionId: number;
    questionTitle?: string | null;
    answerText: string | null;
    createdAt: string;
  }[];
  selections: {
    id: number;
    candidateId: number;
    questionId: number;
    questionTitle?: string | null;
    optionId: number;
    optionLabel?: string | null;
    createdAt: string;
  }[];
  history: {
    id: number;
    candidateId: number;
    stageId: number;
    movedBy: number | null;
    movedAt: string;
  }[];
  offer: {
    id: number;
    status: string;
    salary: string | null;
    currency: string | null;
    payFrequency: string | null;
    startDate: string | null;
    expiryDate: string | null;
    sentAt: string | null;
    renderedHtml: string | null;
  } | null;
  rejections: CandidateRejection[];
  interviews: CandidateInterview[];
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "super_admin" | "hiring_manager" | "interviewer";
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TemplateBodyBlock = {
  type: "heading" | "text" | "button" | "image";
  content: string;
};

export type Template = {
  id: number;
  name: string;
  type: "offer" | "rejection" | "assessment_invite" | "general";
  subject: string;
  bodyJson: TemplateBodyBlock[];
  createdAt: string;
  updatedAt: string;
};

export type Offer = {
  id: number;
  candidateId: number;
  jobId: number;
  templateId: number | null;
  salary: number | null;
  currency: string | null;
  payFrequency: "hourly" | "daily" | "weekly" | "monthly" | "yearly" | null;
  startDate: string | null;
  expiryDate: string | null;
  status: "draft" | "sent" | "pending" | "accepted" | "declined" | "withdrawn";
  renderedHtml: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsReport = {
  summary: {
    totalCandidates: number;
    totalCandidatesDeltaPct: number;
    openPositions: number;
    openPositionsDelta: number;
    avgTimeToHireDays: number;
    avgTimeToHireDeltaDays: number;
    offerAcceptanceRate: number;
    offerAcceptanceRateDeltaPct: number;
  };
  pipelineReport: {
    stage: string;
    current: number;
    previous: number;
  }[];
  candidateVolume: {
    date: string;
    applications: number;
    hires: number;
  }[];
  sourceOfCandidates: {
    name: string;
    value: number;
  }[];
  timeToHireByDepartment: {
    dept: string;
    days: number;
  }[];
  offerTrends: {
    month: string;
    sent: number;
    accepted: number;
  }[];
};

export type AnalyticsExportPayload = {
  format: "csv" | "json";
  fileName: string;
  mimeType: string;
  content: string;
};

export type ActiveLogLevel = "info" | "warn" | "error" | "success";
export type ActiveLogStatusGroup = "all" | "2xx" | "4xx" | "5xx";
export type ActiveLogWindowSize = "15m" | "1h" | "6h" | "24h";

export type ActiveLog = {
  id: number;
  timestamp: string;
  level: ActiveLogLevel;
  service: string;
  action: string;
  endpoint: string;
  actor: string;
  statusCode: number;
  latencyMs: number;
  requestId: string;
  ip: string;
  device: string;
  meta?: unknown;
};

export type ActiveLogFilters = {
  search?: string;
  level?: "all" | ActiveLogLevel;
  service?: "all" | string;
  statusGroup?: ActiveLogStatusGroup;
  windowSize?: ActiveLogWindowSize;
  limit?: number;
  offset?: number;
};

export type ActiveLogExportPayload = {
  format: "csv" | "json";
  fileName: string;
  mimeType: string;
  content: string;
};
