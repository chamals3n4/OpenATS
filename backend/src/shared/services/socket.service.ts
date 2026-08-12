import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { db } from "../../db";
import { jobChatMessages, candidateChatMessages, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAccessToken } from "../auth/verify-token";
import type { AuthenticatedUser } from "../auth/verify-token";
import {
  canAccessCandidate,
  canAccessJob,
  parseRoomId,
} from "../auth/job-access";
import logger from "../../utils/logger";
import { getErrorMessage } from "../../utils/error.utils";

const STAFF_ROOM = "staff";
const jobRoom = (jobId: number) => `job_${jobId}`;
const candidateRoom = (candidateId: number) => `candidate_${candidateId}`;

interface SocketData {
  user: AuthenticatedUser;
}

// Events sent to a single socket. Broadcasts go through `io`.
interface ServerToClientEvents {
  room_denied: (payload: { room: "job" | "candidate"; id: number }) => void;
  write_denied: (payload: { event: string }) => void;
}

type AuthedSocket = Socket<
  Record<string, never>,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export class SocketService {
  private static instance: SocketService;
  private io: Server | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token;

      if (typeof token !== "string" || !token) {
        next(new Error("unauthorized"));
        return;
      }

      try {
        (socket as AuthedSocket).data.user = await verifyAccessToken(token);
        next();
      } catch (err) {
        logger.warn(
          `[socket] rejected connection: ${err instanceof Error ? err.message : String(err)}`,
        );
        next(new Error("unauthorized"));
      }
    });

    this.io.on("connection", (rawSocket: Socket) => {
      const socket = rawSocket as AuthedSocket;
      const user = socket.data.user;

      socket.join(STAFF_ROOM);
      logger.info(`Socket connected: ${socket.id} (user ${user.id})`);

      // job room — hiring team members only
      socket.on("join_job", async (rawJobId: unknown) => {
        const jobId = parseRoomId(rawJobId);
        if (jobId === null) return;

        if (!(await canAccessJob(user, jobId))) {
          logger.warn(
            `[socket] user ${user.id} denied join of job_${jobId} (not on hiring team)`,
          );
          socket.emit("room_denied", { room: "job", id: jobId });
          return;
        }

        socket.join(jobRoom(jobId));
        logger.info(`Socket ${socket.id} joined job room: job_${jobId}`);
      });

      // candidate room — follows the candidate's job
      socket.on("join_candidate", async (rawCandidateId: unknown) => {
        const candidateId = parseRoomId(rawCandidateId);
        if (candidateId === null) return;

        if (!(await canAccessCandidate(user, candidateId))) {
          logger.warn(
            `[socket] user ${user.id} denied join of candidate_${candidateId}`,
          );
          socket.emit("room_denied", { room: "candidate", id: candidateId });
          return;
        }

        socket.join(candidateRoom(candidateId));
        logger.info(
          `Socket ${socket.id} joined candidate room: candidate_${candidateId}`,
        );
      });

      // Writes require the room, which the join already checked.
      const inJobRoom = (jobId: number) => socket.rooms.has(jobRoom(jobId));
      const inCandidateRoom = (candidateId: number) =>
        socket.rooms.has(candidateRoom(candidateId));

      const denyWrite = (event: string, id: number | null) => {
        logger.warn(
          `[socket] user ${user.id} denied ${event} for room id ${id} (not joined)`,
        );
        socket.emit("write_denied", { event });
      };

      socket.on(
        "send_job_message",
        async (data: {
          jobId: number;
          message: string;
          replyToId?: number;
        }) => {
          const jobId = parseRoomId(data?.jobId);
          if (jobId === null || !inJobRoom(jobId)) {
            denyWrite("send_job_message", jobId);
            return;
          }

          try {
            const [newMessage] = await db
              .insert(jobChatMessages)
              .values({
                jobId,
                senderId: user.id,
                message: data.message,
                replyToId: data.replyToId,
              })
              .returning();

            const [sender] = await db
              .select({
                firstName: users.firstName,
                lastName: users.lastName,
                avatarUrl: users.avatarUrl,
              })
              .from(users)
              .where(eq(users.id, user.id))
              .limit(1);

            this.io?.to(jobRoom(jobId)).emit("new_job_message", {
              ...newMessage,
              senderName: sender
                ? `${sender.firstName} ${sender.lastName}`
                : null,
              senderAvatar: sender?.avatarUrl ?? null,
            });
          } catch (error) {
            logger.error(`Error saving job message: ${getErrorMessage(error)}`);
          }
        },
      );

      socket.on(
        "edit_job_message",
        async (data: { jobId: number; messageId: number; message: string }) => {
          const jobId = parseRoomId(data?.jobId);
          if (jobId === null || !inJobRoom(jobId)) {
            denyWrite("edit_job_message", jobId);
            return;
          }

          try {
            const [updated] = await db
              .update(jobChatMessages)
              .set({ message: data.message })
              .where(
                and(
                  eq(jobChatMessages.id, data.messageId),
                  eq(jobChatMessages.jobId, jobId),
                  eq(jobChatMessages.senderId, user.id),
                  eq(jobChatMessages.isDeleted, false),
                ),
              )
              .returning();

            if (!updated) return;

            const [sender] = await db
              .select({
                firstName: users.firstName,
                lastName: users.lastName,
                avatarUrl: users.avatarUrl,
              })
              .from(users)
              .where(eq(users.id, user.id))
              .limit(1);

            this.io?.to(jobRoom(jobId)).emit("job_message_updated", {
              ...updated,
              senderName: sender
                ? `${sender.firstName} ${sender.lastName}`
                : null,
              senderAvatar: sender?.avatarUrl ?? null,
            });
          } catch (error) {
            logger.error(`Error updating job message: ${getErrorMessage(error)}`);
          }
        },
      );

      socket.on(
        "delete_job_message",
        async (data: { jobId: number; messageId: number }) => {
          const jobId = parseRoomId(data?.jobId);
          if (jobId === null || !inJobRoom(jobId)) {
            denyWrite("delete_job_message", jobId);
            return;
          }

          try {
            const [deleted] = await db
              .update(jobChatMessages)
              .set({ isDeleted: true })
              .where(
                and(
                  eq(jobChatMessages.id, data.messageId),
                  eq(jobChatMessages.jobId, jobId),
                  eq(jobChatMessages.senderId, user.id),
                  eq(jobChatMessages.isDeleted, false),
                ),
              )
              .returning({ id: jobChatMessages.id });

            if (!deleted) return;
            this.io
              ?.to(jobRoom(jobId))
              .emit("job_message_deleted", { id: deleted.id });
          } catch (error) {
            logger.error(`Error deleting job message: ${getErrorMessage(error)}`);
          }
        },
      );

      socket.on(
        "send_candidate_message",
        async (data: {
          candidateId: number;
          message: string;
          replyToId?: number;
        }) => {
          const candidateId = parseRoomId(data?.candidateId);
          if (candidateId === null || !inCandidateRoom(candidateId)) {
            denyWrite("send_candidate_message", candidateId);
            return;
          }

          try {
            const [newMessage] = await db
              .insert(candidateChatMessages)
              .values({
                candidateId,
                senderId: user.id,
                message: data.message,
                replyToId: data.replyToId,
              })
              .returning();

            // broadcast to the candidate room
            this.io
              ?.to(candidateRoom(candidateId))
              .emit("new_candidate_message", newMessage);
          } catch (error) {
            logger.error(`Error saving candidate message: ${getErrorMessage(error)}`);
          }
        },
      );

      socket.on("disconnect", () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  public notifyCandidateApplied(jobId: number) {
    this.io?.to(STAFF_ROOM).emit("candidate_applied", { jobId });
  }

  // Broadcast a candidate pipeline stage change to authenticated dashboard clients
  public notifyStageChanged(event: {
    candidateId: number;
    jobId: number;
    stageId: number;
  }) {
    this.io?.to(STAFF_ROOM).emit("candidate_stage_changed", event);
  }

  // Broadcast an offer create/update/status change to authenticated dashboard clients
  public notifyOfferChanged(event: {
    offerId: number;
    candidateId: number;
    jobId: number;
  }) {
    this.io?.to(STAFF_ROOM).emit("offer_changed", event);
  }

  // Broadcast an interview create/update/delete/feedback change
  public notifyInterviewChanged(event: {
    interviewId: number;
    candidateId: number;
  }) {
    this.io?.to(STAFF_ROOM).emit("interview_changed", event);
  }

  // Broadcast assessment attempt progress (answer saved / attempt completed)
  public notifyAssessmentProgress(event: {
    candidateId: number;
    attemptId: number;
  }) {
    this.io?.to(STAFF_ROOM).emit("assessment_progress_updated", event);
  }

  public async sendSystemMessageToJob(jobId: number, message: string) {
    try {
      const [newMessage] = await db
        .insert(jobChatMessages)
        .values({
          jobId,
          senderId: 1,
          message,
          isSystemMessage: true,
        })
        .returning();

      this.io?.to(jobRoom(jobId)).emit("new_job_message", newMessage);
    } catch (error) {
      logger.error(`Error sending system job message: ${getErrorMessage(error)}`);
    }
  }
  // Broadcast a CV analysis status change to authenticated dashboard clients
  public emitCvAnalysisUpdate(event: {
    candidateId: number;
    jobId: number;
    status: "done" | "failed";
  }) {
    this.io?.to(STAFF_ROOM).emit("cv_analysis_updated", event);
  }
}

export const socketService = SocketService.getInstance();
