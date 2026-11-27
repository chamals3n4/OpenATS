import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ where: vi.fn(), values: vi.fn() }));
vi.mock("../../src/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/db")>();
  return { ...original, db: {
    insert: () => ({ values: mocks.values }),
    update: () => ({ set: () => ({ where: mocks.where }) }),
    delete: () => ({ where: mocks.where }),
  } };
});
import { createNote, updateNote, deleteNote } from "../../src/modules/candidate/candidate-notes.controller";
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() });
const request = (body: unknown = {}, noteId = "42") => ({ body, params: { id: "5", noteId }, user: { id: 7 } }) as unknown as Request;
const asResponse = (res: ReturnType<typeof response>) => res as unknown as Response;

beforeEach(() => { vi.clearAllMocks(); mocks.where.mockReturnValue({ returning: async () => [{ id: 42 }] }); mocks.values.mockReturnValue({ returning: async () => [{ id: 42 }] }); });
describe("candidate notes", () => {
  it("rejects empty and oversized notes", async () => {
    const res = response();
    await createNote(request({ body: "  " }), asResponse(res));
    expect(res.status).toHaveBeenCalledWith(400);
    await createNote(request({ body: "x".repeat(20001) }), asResponse(res));
    expect(mocks.values).not.toHaveBeenCalled();
  });
  it("uses the authenticated user as author", async () => {
    const res = response();
    await createNote(request({ body: "**Hello**" }), asResponse(res));
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ candidateId: 5, authorId: 7, body: "**Hello**" }));
    const query = new PgDialect().sqlToQuery(mocks.values.mock.calls[0]![0].stageName);
    expect(query.sql).toContain("current_stage_id");
    expect(query.params).toEqual([5]);
    expect(res.status).toHaveBeenCalledWith(201);
  });
  it.each([updateNote, deleteNote])("scopes note mutations to both candidate and note", async (handler) => {
    const res = response();
    await handler(request({ body: "Updated" }), asResponse(res));
    const query = new PgDialect().sqlToQuery(mocks.where.mock.calls[0]![0]);
    expect(query.params).toEqual([42, 5]);
  });
  it("returns 404 when the note does not belong to the candidate", async () => {
    mocks.where.mockReturnValue({ returning: async () => [] });
    const res = response();
    await deleteNote(request(), asResponse(res));
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
