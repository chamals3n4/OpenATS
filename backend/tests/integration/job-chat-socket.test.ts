import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { eq, inArray } from "drizzle-orm";
import { io as connect, type Socket } from "socket.io-client";

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  const { jwks } = await import("../helpers/jwks-holder");
  return { ...actual, createRemoteJWKSet: () => async () => jwks.publicKey };
});

import app from "../../src/app";
import { db } from "../../src/db";
import { company, departments } from "../../src/db/schema/company";
import { jobs } from "../../src/db/schema/jobs";
import { jobHiringTeam } from "../../src/db/schema/pipeline";
import { jobChatMessages } from "../../src/db/schema";
import { users } from "../../src/db/schema/users";
import { socketService } from "../../src/shared/services/socket.service";
import { initTestKeys, signToken, bearer } from "../helpers/jwt";

// The job discussion over a real socket: joining, sending as soon as the join is confirmed, and
// what the server refuses.

const SUFFIX = `chat${Date.now()}`;
let server: http.Server;
let url: string;
let memberToken: string, outsiderToken: string;
const userIds: number[] = [];
let companyId: number, departmentId: number, jobId: number;
const sockets: Socket[] = [];

const open = (token: string) =>
  new Promise<Socket>((resolve, reject) => {
    const socket = connect(url, { auth: { token }, transports: ["websocket"], forceNew: true });
    sockets.push(socket);
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

const join = (socket: Socket, id: unknown) =>
  new Promise<{ ok: boolean }>((resolve) => socket.emit("join_job", id, resolve));

const next = <T>(socket: Socket, event: string, ms = 3000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} within ${ms} ms`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const stored = async () =>
  (await db.select().from(jobChatMessages).where(eq(jobChatMessages.jobId, jobId))).map((m) => m.message);

beforeAll(async () => {
  await initTestKeys();
  const [co] = await db.insert(company).values({ name: `Co ${SUFFIX}`, email: `co.${SUFFIX}@example.test` }).returning();
  companyId = co!.id;
  const [dept] = await db.insert(departments).values({ name: `Dept ${SUFFIX}`, companyId }).returning();
  departmentId = dept!.id;

  const member = await bearer({ email: `member.${SUFFIX}@example.test`, role: "hiring_manager", firstName: "Ayesha", lastName: "Perera" });
  const outsider = await bearer({ email: `outsider.${SUFFIX}@example.test`, role: "hiring_manager" });
  userIds.push(member.user.id, outsider.user.id);
  memberToken = await signToken({ sub: String(member.user.id) });
  outsiderToken = await signToken({ sub: String(outsider.user.id) });

  const [job] = await db
    .insert(jobs)
    .values({ title: `Job ${SUFFIX}`, slug: `job-${SUFFIX}`, employmentType: "full_time", departmentId, createdBy: member.user.id })
    .returning();
  jobId = job!.id;
  await db.insert(jobHiringTeam).values({ jobId, userId: member.user.id });

  server = http.createServer(app);
  socketService.initialize(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await db.delete(jobChatMessages).where(eq(jobChatMessages.jobId, jobId));
  await db.delete(jobHiringTeam).where(eq(jobHiringTeam.jobId, jobId));
  await db.delete(jobs).where(eq(jobs.id, jobId));
  await db.delete(departments).where(eq(departments.id, departmentId));
  await db.delete(company).where(eq(company.id, companyId));
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("joining a job's discussion", () => {
  it("is confirmed for someone on the hiring team", async () => {
    const socket = await open(memberToken);
    expect(await join(socket, jobId)).toEqual({ ok: true });
  });

  it("is refused, and says so, for someone who is not", async () => {
    const socket = await open(outsiderToken);
    const denied = next(socket, "room_denied");

    expect(await join(socket, jobId)).toEqual({ ok: false });
    await expect(denied).resolves.toMatchObject({ room: "job", id: jobId });
  });

  it("is refused for an id that is not one", async () => {
    const socket = await open(memberToken);
    expect(await join(socket, "abc")).toEqual({ ok: false });
  });
});

describe("sending a message", () => {
  it("is saved and comes back to everyone in the room once the join is confirmed", async () => {
    const socket = await open(memberToken);
    await join(socket, jobId);
    const arrived = next<{ message: string; senderName: string }>(socket, "new_job_message");

    socket.emit("send_job_message", { jobId, message: "  Strong candidate  " });

    expect(await arrived).toMatchObject({ message: "Strong candidate", senderName: "Ayesha Perera" });
    expect(await stored()).toContain("Strong candidate");
  });

  it("is refused before the join, which is why the browser waits for it", async () => {
    const socket = await open(memberToken);
    const refused = next(socket, "write_denied");

    socket.emit("send_job_message", { jobId, message: "Too early" });

    await expect(refused).resolves.toMatchObject({ event: "send_job_message" });
    expect(await stored()).not.toContain("Too early");
  });

  it.each([
    ["only spaces", "    "],
    ["not text", { evil: true }],
    ["longer than a message can be", "x".repeat(5001)],
  ])("is not saved when it is %s", async (_name, message) => {
    const socket = await open(memberToken);
    await join(socket, jobId);
    const before = (await stored()).length;

    socket.emit("send_job_message", { jobId, message });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect((await stored()).length).toBe(before);
  });
});
