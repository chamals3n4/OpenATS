import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

type JobRecord = {
  id: number;
  title: string;
  createdBy: number;
  status: "draft" | "inactive" | "published" | "closed" | "archived";
};

type StageRecord = {
  id: number;
  jobId: number;
  name: string;
  position: number;
  stageType:
    | "none"
    | "source"
    | "assessment"
    | "interview"
    | "offer"
    | "rejection";
};

type AssessmentRecord = {
  id: number;
  title: string;
  timeLimit: number;
  passScore: number;
  createdBy: number;
};

type AttachmentRecord = {
  id: number;
  jobId: number;
  assessmentId: number;
  triggerStageId: number;
  createdAt: string;
};

const state = {
  jobs: [] as JobRecord[],
  stages: [] as StageRecord[],
  assessments: [] as AssessmentRecord[],
  attachments: [] as AttachmentRecord[],
  ids: {
    job: 1,
    stage: 1,
    assessment: 1,
    attachment: 1,
  },
};

vi.mock("../../src/middlewares/auth.middleware", () => ({
  authMiddleware: (
    req: {
      user?: {
        id: number;
        role: "super_admin" | "hiring_manager" | "interviewer";
        isActive: boolean;
      };
    },
    _res: unknown,
    next: () => void,
  ) => {
    req.user = { id: 1, role: "super_admin", isActive: true };
    next();
  },
}));

vi.mock("../../src/middlewares/rbac.middleware", () => ({
  requireAnyRole: () => (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  requireJobReadAccess:
    () => (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  requireJobManageAccess:
    () => (_req: unknown, _res: unknown, next: () => void) =>
      next(),
}));

vi.mock("../../src/services/job.service", () => ({
  jobService: {
    create: vi.fn(
      (input: {
        title: string;
        createdBy: number;
        status?: "draft" | "inactive" | "published" | "closed" | "archived";
      }) => {
        const record: JobRecord = {
          id: state.ids.job++,
          title: input.title,
          createdBy: input.createdBy,
          status: input.status ?? "draft",
        };
        state.jobs.push(record);
        return Promise.resolve(record);
      },
    ),
    getById: vi.fn((id: number) => {
      const found = state.jobs.find((j) => j.id === id);
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        skills: [],
        hiringTeam: [],
        pipelineStages: state.stages.filter((s) => s.jobId === found.id),
      });
    }),
    getAssessments: vi.fn((jobId: number) =>
      Promise.resolve(state.attachments.filter((a) => a.jobId === jobId)),
    ),
    attachAssessment: vi.fn(
      (input: {
        jobId: number;
        assessmentId: number;
        triggerStageId: number;
      }) => {
        const record: AttachmentRecord = {
          id: state.ids.attachment++,
          ...input,
          createdAt: new Date().toISOString(),
        };
        state.attachments.push(record);
        return Promise.resolve(record);
      },
    ),
    detachAssessment: vi.fn((attachmentId: number) => {
      const idx = state.attachments.findIndex((a) => a.id === attachmentId);
      if (idx < 0) return Promise.resolve(null);
      const [removed] = state.attachments.splice(idx, 1);
      return Promise.resolve(removed ?? null);
    }),
    getAllAccessible: vi.fn(() => Promise.resolve(state.jobs)),
    listPublishedForCareers: vi.fn(() =>
      Promise.resolve(state.jobs.filter((j) => j.status === "published")),
    ),
    getBySlug: vi.fn(() => Promise.resolve(null)),
    update: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock("../../src/services/pipeline.service", () => ({
  pipelineService: {
    getByJobId: vi.fn((jobId: number) =>
      Promise.resolve(
        state.stages
          .filter((s) => s.jobId === jobId)
          .sort((a, b) => a.position - b.position),
      ),
    ),
    getById: vi.fn((stageId: number) =>
      Promise.resolve(state.stages.find((s) => s.id === stageId) ?? null),
    ),
    create: vi.fn(
      (
        jobId: number,
        input: {
          name: string;
          position?: number;
          stageType?:
            | "none"
            | "source"
            | "assessment"
            | "interview"
            | "offer"
            | "rejection";
        },
      ) => {
        const used = state.stages
          .filter((s) => s.jobId === jobId)
          .map((s) => s.position);
        const nextPosition = used.length === 0 ? 1 : Math.max(...used) + 1;
        const record: StageRecord = {
          id: state.ids.stage++,
          jobId,
          name: input.name,
          position: input.position ?? nextPosition,
          stageType: input.stageType ?? "none",
        };
        state.stages.push(record);
        return Promise.resolve(record);
      },
    ),
    update: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve(null)),
    reorder: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("../../src/services/assessment.service", () => ({
  assessmentService: {
    getAll: vi.fn(() => Promise.resolve(state.assessments)),
    getById: vi.fn((id: number) =>
      Promise.resolve(state.assessments.find((a) => a.id === id) ?? null),
    ),
    create: vi.fn(
      (input: {
        title: string;
        timeLimit: number;
        passScore: number;
        createdBy: number;
      }) => {
        const record: AssessmentRecord = {
          id: state.ids.assessment++,
          title: input.title,
          timeLimit: input.timeLimit,
          passScore: input.passScore,
          createdBy: input.createdBy,
        };
        state.assessments.push(record);
        return Promise.resolve(record);
      },
    ),
    update: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve(null)),
    createQuestion: vi.fn(() => Promise.resolve(null)),
    updateQuestion: vi.fn(() => Promise.resolve(null)),
    deleteQuestion: vi.fn(() => Promise.resolve(null)),
  },
}));

import app from "../../src/app";

describe("Hiring Process Integration (API-level)", () => {
  beforeEach(() => {
    state.jobs = [];
    state.stages = [];
    state.assessments = [];
    state.attachments = [];
    state.ids = { job: 1, stage: 1, assessment: 1, attachment: 1 };
  });

  it("creates a job and returns draft status", async () => {
    const res = await request(app).post("/api/jobs").send({
      title: "Frontend Engineer",
      departmentId: 1,
      employmentType: "full_time",
    });

    expect(res.status).toBe(201);
    expect(res.body?.data?.id).toBe(1);
    expect(res.body?.data?.title).toBe("Frontend Engineer");
    expect(res.body?.data?.status).toBe("draft");
  });

  it("creates and lists pipeline stages for a job", async () => {
    const job = await request(app).post("/api/jobs").send({
      title: "Backend Engineer",
      departmentId: 1,
      employmentType: "full_time",
    });
    const jobId = Number(job.body?.data?.id);

    const stageCreate = await request(app)
      .post(`/api/jobs/${jobId}/pipeline`)
      .send({
        name: "Technical Interview",
        stageType: "interview",
      });

    expect(stageCreate.status).toBe(201);
    expect(stageCreate.body?.data?.jobId).toBe(jobId);
    expect(stageCreate.body?.data?.stageType).toBe("interview");

    const pipelineList = await request(app).get(`/api/jobs/${jobId}/pipeline`);
    expect(pipelineList.status).toBe(200);
    expect(Array.isArray(pipelineList.body?.data)).toBe(true);
    expect(pipelineList.body?.data).toHaveLength(1);
    expect(pipelineList.body?.data[0]?.name).toBe("Technical Interview");
  });
});
