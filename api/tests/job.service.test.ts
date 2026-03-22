import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jobs, jobHiringTeam } from "../src/db/schema";
import type { CreateJobInput, UpdateJobInput } from "../src/services/job.service";

const h = vi.hoisted(() => {
    const selectQueue: unknown[][] = [];

    const mockSelect = vi.fn(() => {
        const rows = selectQueue.shift() ?? [];
        const chain: {
            from: ReturnType<typeof vi.fn>;
            where: ReturnType<typeof vi.fn>;
            orderBy: ReturnType<typeof vi.fn>;
            then: (
                onFulfilled: (value: unknown) => unknown,
                onRejected?: (reason: unknown) => unknown,
            ) => Promise<unknown>;
        } = {
            from: vi.fn(function (this: typeof chain) {
                return this;
            }),
            where: vi.fn(function (this: typeof chain) {
                return this;
            }),
            orderBy: vi.fn(function (this: typeof chain) {
                return this;
            }),
            then(onFulfilled, onRejected) {
                return Promise.resolve(rows).then(onFulfilled, onRejected);
            },
        };
        return chain;
    });

    const mockTx = {
        insert: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const mockTransaction = vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
    );

    const mockReturning = vi.fn();
    const mockWhere = vi.fn();
    const mockDelete = vi.fn();
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockDelete.mockReturnValue({ where: mockWhere });

    return {
        selectQueue,
        mockSelect,
        mockTransaction,
        mockTx,
        mockDelete,
        mockWhere,
        mockReturning,
    };
});

vi.mock("../src/db", () => ({
    db: {
        delete: h.mockDelete,
        select: h.mockSelect,
        transaction: h.mockTransaction,
    },
}));

import { jobService } from "../src/services/job.service";

describe("jobService.delete", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.mockWhere.mockReturnValue({ returning: h.mockReturning });
        h.mockDelete.mockReturnValue({ where: h.mockWhere });
        h.mockReturning.mockReset();
    });

    it("returns the deleted row when the database returns one", async () => {
        const deletedRow = { id: 42, title: "Engineer" };
        h.mockReturning.mockResolvedValue([deletedRow]);

        const result = await jobService.delete(42);

        expect(h.mockDelete).toHaveBeenCalledTimes(1);
        expect(h.mockWhere).toHaveBeenCalledTimes(1);
        expect(h.mockReturning).toHaveBeenCalledTimes(1);
        expect(result).toEqual(deletedRow);
    });

    it("returns null when nothing was deleted", async () => {
        h.mockReturning.mockResolvedValue([]);

        const result = await jobService.delete(999);

        expect(result).toBeNull();
    });
});

describe("jobService.getById (complex select chain)", () => {
    beforeEach(() => {
        h.selectQueue.length = 0;
        vi.clearAllMocks();
    });

    it("aggregates job, skills, hiring team, and pipeline stages", async () => {
        const jobRow = {
            id: 7,
            title: "Engineer",
            slug: "engineer-1",
            departmentId: 1,
            employmentType: "full_time" as const,
            status: "published" as const,
            createdBy: 1,
        };

        h.selectQueue.push(
            [jobRow],
            [{ skill: "TypeScript" }, { skill: "Node" }],
            [{ userId: 10, jobId: 7 }],
            [
                {
                    id: 1,
                    jobId: 7,
                    name: "Applied",
                    position: 0,
                    stageType: "none",
                },
                {
                    id: 2,
                    jobId: 7,
                    name: "Interview",
                    position: 1,
                    stageType: "none",
                },
            ],
        );

        const result = await jobService.getById(7);

        expect(h.mockSelect).toHaveBeenCalledTimes(4);
        expect(result).toEqual({
            ...jobRow,
            skills: ["TypeScript", "Node"],
            hiringTeam: [{ userId: 10, jobId: 7 }],
            pipelineStages: [
                {
                    id: 1,
                    jobId: 7,
                    name: "Applied",
                    position: 0,
                    stageType: "none",
                },
                {
                    id: 2,
                    jobId: 7,
                    name: "Interview",
                    position: 1,
                    stageType: "none",
                },
            ],
        });
    });

    it("returns null when job row is missing", async () => {
        h.selectQueue.push([]);

        const result = await jobService.getById(404);

        expect(result).toBeNull();
        expect(h.mockSelect).toHaveBeenCalledTimes(1);
    });
});

describe("jobService.create (transaction)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Date, "now").mockReturnValue(999_000);

        h.mockTx.insert.mockImplementation((table: unknown) => {
            if (table === jobs) {
                return {
                    values: vi.fn(() => ({
                        returning: vi.fn(() =>
                            Promise.resolve([
                                {
                                    id: 10,
                                    title: "Engineer",
                                    slug: "engineer-999000",
                                    departmentId: 2,
                                    employmentType: "full_time",
                                    createdBy: 5,
                                },
                            ]),
                        ),
                    })),
                };
            }
            if (table === jobHiringTeam) {
                return {
                    values: vi.fn(() => Promise.resolve()),
                };
            }
            throw new Error(`unexpected tx.insert table in test: ${String(table)}`);
        });

        h.mockTx.select.mockImplementation(() => {
            const rows: unknown[] = [];
            const chain: {
                from: ReturnType<typeof vi.fn>;
                orderBy: ReturnType<typeof vi.fn>;
                then: (onFulfilled: (value: unknown) => unknown) => Promise<unknown>;
            } = {
                from: vi.fn(function (this: typeof chain) {
                    return this;
                }),
                orderBy: vi.fn(function (this: typeof chain) {
                    return this;
                }),
                then(onFulfilled) {
                    return Promise.resolve(rows).then(onFulfilled);
                },
            };
            return chain;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("creates job, skips template stages when templates empty, inserts hiring team, returns created job", async () => {
        const input: CreateJobInput = {
            title: "Engineer",
            departmentId: 2,
            employmentType: "full_time",
            createdBy: 5,
        };

        const result = await jobService.create(input);

        expect(h.mockTransaction).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({
            id: 10,
            title: "Engineer",
            slug: "engineer-999000",
            departmentId: 2,
            createdBy: 5,
        });

        expect(h.mockTx.insert).toHaveBeenCalledWith(jobs);
        expect(h.mockTx.insert).toHaveBeenCalledWith(jobHiringTeam);
        expect(h.mockTx.select).toHaveBeenCalled();
    });
});

describe("jobService.update (transaction, no skills)", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        h.mockTx.update.mockImplementation(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => ({
                    returning: vi.fn(() =>
                        Promise.resolve([
                            {
                                id: 3,
                                title: "Senior Engineer",
                                slug: "senior",
                                departmentId: 1,
                                employmentType: "full_time",
                                status: "published",
                            },
                        ]),
                    ),
                })),
            })),
        }));
    });

    it("returns updated row when update matches", async () => {
        const input: UpdateJobInput = { title: "Senior Engineer" };

        const result = await jobService.update(3, input);

        expect(h.mockTransaction).toHaveBeenCalledTimes(1);
        expect(result).toMatchObject({ id: 3, title: "Senior Engineer" });
    });

    it("returns null when no row updated", async () => {
        h.mockTx.update.mockImplementation(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => ({
                    returning: vi.fn(() => Promise.resolve([])),
                })),
            })),
        }));

        const result = await jobService.update(999, { title: "Nope" });

        expect(result).toBeNull();
    });
});