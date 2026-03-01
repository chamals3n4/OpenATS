import { relations } from "drizzle-orm";

import { company, departments } from "./company";
import { users } from "./users";
import { templates } from "./templates";
import { jobs, jobSkills } from "./jobs";
import {
  pipelineStageTemplates,
  jobPipelineStages,
  jobHiringTeam,
} from "./pipeline";
import {
  assessments,
  assessmentQuestions,
  assessmentQuestionOptions,
  jobCustomQuestions,
  jobCustomQuestionOptions,
  jobAssessmentAttachments,
} from "./assessments";
import {
  candidates,
  candidateStageHistory,
  candidateCustomAnswers,
  candidateCustomAnswerSelections,
  candidateAssessmentAttempts,
  candidateAssessmentAnswers,
  candidateAssessmentAnswerSelections,
  candidateCvAnalysis,
} from "./candidates";
import { offers } from "./offers";
import {
  emailMessages,
  jobChatMessages,
  candidateChatMessages,
} from "./communications";

// company
export const companyRelations = relations(company, ({ many }) => ({
  departments: many(departments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(company, {
    fields: [departments.companyId],
    references: [company.id],
  }),
  jobs: many(jobs),
}));

// users
export const usersRelations = relations(users, ({ many }) => ({
  createdJobs: many(jobs),
  createdTemplates: many(templates),
  createdAssessments: many(assessments),
  hiringTeamEntries: many(jobHiringTeam),
  createdOffers: many(offers),
  sentEmails: many(emailMessages),
  jobChatMessages: many(jobChatMessages),
  candidateChatMessages: many(candidateChatMessages),
  stageMoves: many(candidateStageHistory),
}));

// templates
export const templatesRelations = relations(templates, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  offerStages: many(jobPipelineStages, { relationName: "offerTemplate" }),
  rejectionStages: many(jobPipelineStages, {
    relationName: "rejectionTemplate",
  }),
  offers: many(offers),
  emailMessages: many(emailMessages),
}));

// jobs
export const jobsRelations = relations(jobs, ({ one, many }) => ({
  department: one(departments, {
    fields: [jobs.departmentId],
    references: [departments.id],
  }),
  createdBy: one(users, {
    fields: [jobs.createdBy],
    references: [users.id],
  }),
  skills: many(jobSkills),
  pipelineStages: many(jobPipelineStages),
  hiringTeam: many(jobHiringTeam),
  customQuestions: many(jobCustomQuestions),
  assessmentAttachments: many(jobAssessmentAttachments),
  candidates: many(candidates),
  offers: many(offers),
  chatMessages: many(jobChatMessages),
  cvAnalyses: many(candidateCvAnalysis),
}));

export const jobSkillsRelations = relations(jobSkills, ({ one }) => ({
  job: one(jobs, {
    fields: [jobSkills.jobId],
    references: [jobs.id],
  }),
}));

// pipeline
export const pipelineStageTemplatesRelations = relations(
  pipelineStageTemplates,
  ({ many }) => ({
    jobStages: many(jobPipelineStages),
  }),
);

export const jobPipelineStagesRelations = relations(
  jobPipelineStages,
  ({ one, many }) => ({
    job: one(jobs, {
      fields: [jobPipelineStages.jobId],
      references: [jobs.id],
    }),
    offerTemplate: one(templates, {
      fields: [jobPipelineStages.offerTemplateId],
      references: [templates.id],
      relationName: "offerTemplate",
    }),
    rejectionTemplate: one(templates, {
      fields: [jobPipelineStages.rejectionTemplateId],
      references: [templates.id],
      relationName: "rejectionTemplate",
    }),
    sourceTemplate: one(pipelineStageTemplates, {
      fields: [jobPipelineStages.sourceTemplateId],
      references: [pipelineStageTemplates.id],
    }),
    candidates: many(candidates),
    stageHistory: many(candidateStageHistory),
    assessmentAttachments: many(jobAssessmentAttachments),
  }),
);

export const jobHiringTeamRelations = relations(jobHiringTeam, ({ one }) => ({
  job: one(jobs, {
    fields: [jobHiringTeam.jobId],
    references: [jobs.id],
  }),
  user: one(users, {
    fields: [jobHiringTeam.userId],
    references: [users.id],
  }),
}));

// assessments
export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [assessments.createdBy],
    references: [users.id],
  }),
  questions: many(assessmentQuestions),
  attachments: many(jobAssessmentAttachments),
  attempts: many(candidateAssessmentAttempts),
}));

export const assessmentQuestionsRelations = relations(
  assessmentQuestions,
  ({ one, many }) => ({
    assessment: one(assessments, {
      fields: [assessmentQuestions.assessmentId],
      references: [assessments.id],
    }),
    options: many(assessmentQuestionOptions),
    answers: many(candidateAssessmentAnswers),
  }),
);

export const assessmentQuestionOptionsRelations = relations(
  assessmentQuestionOptions,
  ({ one, many }) => ({
    question: one(assessmentQuestions, {
      fields: [assessmentQuestionOptions.questionId],
      references: [assessmentQuestions.id],
    }),
    selections: many(candidateAssessmentAnswerSelections),
  }),
);

export const jobCustomQuestionsRelations = relations(
  jobCustomQuestions,
  ({ one, many }) => ({
    job: one(jobs, {
      fields: [jobCustomQuestions.jobId],
      references: [jobs.id],
    }),
    options: many(jobCustomQuestionOptions),
    answers: many(candidateCustomAnswers),
    selections: many(candidateCustomAnswerSelections),
  }),
);

export const jobCustomQuestionOptionsRelations = relations(
  jobCustomQuestionOptions,
  ({ one, many }) => ({
    question: one(jobCustomQuestions, {
      fields: [jobCustomQuestionOptions.questionId],
      references: [jobCustomQuestions.id],
    }),
    selections: many(candidateCustomAnswerSelections),
  }),
);

export const jobAssessmentAttachmentsRelations = relations(
  jobAssessmentAttachments,
  ({ one }) => ({
    job: one(jobs, {
      fields: [jobAssessmentAttachments.jobId],
      references: [jobs.id],
    }),
    assessment: one(assessments, {
      fields: [jobAssessmentAttachments.assessmentId],
      references: [assessments.id],
    }),
    triggerStage: one(jobPipelineStages, {
      fields: [jobAssessmentAttachments.triggerStageId],
      references: [jobPipelineStages.id],
    }),
  }),
);

// candidates
export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  job: one(jobs, {
    fields: [candidates.jobId],
    references: [jobs.id],
  }),
  currentStage: one(jobPipelineStages, {
    fields: [candidates.currentStageId],
    references: [jobPipelineStages.id],
  }),
  stageHistory: many(candidateStageHistory),
  customAnswers: many(candidateCustomAnswers),
  customSelections: many(candidateCustomAnswerSelections),
  assessmentAttempts: many(candidateAssessmentAttempts),
  cvAnalysis: many(candidateCvAnalysis),
  offers: many(offers),
  emailMessages: many(emailMessages),
  chatMessages: many(candidateChatMessages),
}));

export const candidateStageHistoryRelations = relations(
  candidateStageHistory,
  ({ one }) => ({
    candidate: one(candidates, {
      fields: [candidateStageHistory.candidateId],
      references: [candidates.id],
    }),
    stage: one(jobPipelineStages, {
      fields: [candidateStageHistory.stageId],
      references: [jobPipelineStages.id],
    }),
    movedBy: one(users, {
      fields: [candidateStageHistory.movedBy],
      references: [users.id],
    }),
  }),
);

export const candidateCustomAnswersRelations = relations(
  candidateCustomAnswers,
  ({ one }) => ({
    candidate: one(candidates, {
      fields: [candidateCustomAnswers.candidateId],
      references: [candidates.id],
    }),
    question: one(jobCustomQuestions, {
      fields: [candidateCustomAnswers.questionId],
      references: [jobCustomQuestions.id],
    }),
  }),
);

export const candidateCustomAnswerSelectionsRelations = relations(
  candidateCustomAnswerSelections,
  ({ one }) => ({
    candidate: one(candidates, {
      fields: [candidateCustomAnswerSelections.candidateId],
      references: [candidates.id],
    }),
    question: one(jobCustomQuestions, {
      fields: [candidateCustomAnswerSelections.questionId],
      references: [jobCustomQuestions.id],
    }),
    option: one(jobCustomQuestionOptions, {
      fields: [candidateCustomAnswerSelections.optionId],
      references: [jobCustomQuestionOptions.id],
    }),
  }),
);

export const candidateAssessmentAttemptsRelations = relations(
  candidateAssessmentAttempts,
  ({ one, many }) => ({
    candidate: one(candidates, {
      fields: [candidateAssessmentAttempts.candidateId],
      references: [candidates.id],
    }),
    assessment: one(assessments, {
      fields: [candidateAssessmentAttempts.assessmentId],
      references: [assessments.id],
    }),
    answers: many(candidateAssessmentAnswers),
  }),
);

export const candidateAssessmentAnswersRelations = relations(
  candidateAssessmentAnswers,
  ({ one, many }) => ({
    attempt: one(candidateAssessmentAttempts, {
      fields: [candidateAssessmentAnswers.attemptId],
      references: [candidateAssessmentAttempts.id],
    }),
    question: one(assessmentQuestions, {
      fields: [candidateAssessmentAnswers.questionId],
      references: [assessmentQuestions.id],
    }),
    selections: many(candidateAssessmentAnswerSelections),
  }),
);

export const candidateAssessmentAnswerSelectionsRelations = relations(
  candidateAssessmentAnswerSelections,
  ({ one }) => ({
    answer: one(candidateAssessmentAnswers, {
      fields: [candidateAssessmentAnswerSelections.answerId],
      references: [candidateAssessmentAnswers.id],
    }),
    option: one(assessmentQuestionOptions, {
      fields: [candidateAssessmentAnswerSelections.optionId],
      references: [assessmentQuestionOptions.id],
    }),
  }),
);

export const candidateCvAnalysisRelations = relations(
  candidateCvAnalysis,
  ({ one }) => ({
    candidate: one(candidates, {
      fields: [candidateCvAnalysis.candidateId],
      references: [candidates.id],
    }),
    job: one(jobs, {
      fields: [candidateCvAnalysis.jobId],
      references: [jobs.id],
    }),
  }),
);

// offers
export const offersRelations = relations(offers, ({ one }) => ({
  candidate: one(candidates, {
    fields: [offers.candidateId],
    references: [candidates.id],
  }),
  job: one(jobs, {
    fields: [offers.jobId],
    references: [jobs.id],
  }),
  template: one(templates, {
    fields: [offers.templateId],
    references: [templates.id],
  }),
  createdBy: one(users, {
    fields: [offers.createdBy],
    references: [users.id],
  }),
}));

// communications
export const emailMessagesRelations = relations(emailMessages, ({ one }) => ({
  candidate: one(candidates, {
    fields: [emailMessages.candidateId],
    references: [candidates.id],
  }),
  sentBy: one(users, {
    fields: [emailMessages.sentBy],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [emailMessages.templateId],
    references: [templates.id],
  }),
}));

export const jobChatMessagesRelations = relations(
  jobChatMessages,
  ({ one }) => ({
    job: one(jobs, {
      fields: [jobChatMessages.jobId],
      references: [jobs.id],
    }),
    sender: one(users, {
      fields: [jobChatMessages.senderId],
      references: [users.id],
    }),
    replyTo: one(jobChatMessages, {
      fields: [jobChatMessages.replyToId],
      references: [jobChatMessages.id],
      relationName: "replies",
    }),
  }),
);

export const candidateChatMessagesRelations = relations(
  candidateChatMessages,
  ({ one }) => ({
    candidate: one(candidates, {
      fields: [candidateChatMessages.candidateId],
      references: [candidates.id],
    }),
    sender: one(users, {
      fields: [candidateChatMessages.senderId],
      references: [users.id],
    }),
    replyTo: one(candidateChatMessages, {
      fields: [candidateChatMessages.replyToId],
      references: [candidateChatMessages.id],
      relationName: "replies",
    }),
  }),
);
