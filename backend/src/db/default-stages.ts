import type { pipelineStageTemplates } from "./schema";

/** The pipeline every new job starts with. Written by seed.ts, and by setup.ts when there are none. */
export const DEFAULT_STAGES: Array<typeof pipelineStageTemplates.$inferInsert> = [
  {
    name: "Screening",
    position: 1,
    stageType: "screening",
    isDeletable: false,
  },
  {
    name: "Screening Qualified",
    position: 2,
    stageType: "screening",
    isDeletable: false,
  },
  {
    name: "Screening Disqualified",
    position: 3,
    stageType: "screening",
    isDeletable: false,
  },
  {
    name: "Interviews",
    position: 4,
    stageType: "interview",
    isDeletable: false,
  },
  {
    name: "Shortlisted",
    position: 5,
    stageType: "interview",
    isDeletable: false,
  },
  { name: "Offer", position: 6, stageType: "offer", isDeletable: false },
  { name: "Hired", position: 7, stageType: "offer", isDeletable: false },
];
