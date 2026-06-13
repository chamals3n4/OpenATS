import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { db } from "../db";
import { jobChatMessages, candidateChatMessages, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import logger from "../utils/logger";

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
        origin: "*", 
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket: Socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // job room
      socket.on("join_job", (jobId: number) => {
        socket.join(`job_${jobId}`);
        logger.info(`Socket ${socket.id} joined job room: job_${jobId}`);
      });

      // candidate room
      socket.on("join_candidate", (candidateId: number) => {
        socket.join(`candidate_${candidateId}`);
        logger.info(`Socket ${socket.id} joined candidate room: candidate_${candidateId}`);
      });

      socket.on("send_job_message", async (data: { jobId: number; senderId: number; message: string; replyToId?: number }) => {
        try {
          const [newMessage] = await db
            .insert(jobChatMessages)
            .values({
              jobId: data.jobId,
              senderId: data.senderId,
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
            .where(eq(users.id, data.senderId))
            .limit(1);

          this.io?.to(`job_${data.jobId}`).emit("new_job_message", {
            ...newMessage,
            senderName: sender ? `${sender.firstName} ${sender.lastName}` : null,
            senderAvatar: sender?.avatarUrl ?? null,
          });
        } catch (error) {
          logger.error("Error saving job message: " + error);
        }
      });

      socket.on(
        "edit_job_message",
        async (data: {
          jobId: number;
          senderId: number;
          messageId: number;
          message: string;
        }) => {
          try {
            const [updated] = await db
              .update(jobChatMessages)
              .set({ message: data.message })
              .where(
                and(
                  eq(jobChatMessages.id, data.messageId),
                  eq(jobChatMessages.jobId, data.jobId),
                  eq(jobChatMessages.senderId, data.senderId),
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
              .where(eq(users.id, data.senderId))
              .limit(1);

            this.io?.to(`job_${data.jobId}`).emit("job_message_updated", {
              ...updated,
              senderName: sender ? `${sender.firstName} ${sender.lastName}` : null,
              senderAvatar: sender?.avatarUrl ?? null,
            });
          } catch (error) {
            logger.error("Error updating job message: " + error);
          }
        },
      );

      socket.on(
        "delete_job_message",
        async (data: { jobId: number; senderId: number; messageId: number }) => {
          try {
            const [deleted] = await db
              .update(jobChatMessages)
              .set({ isDeleted: true })
              .where(
                and(
                  eq(jobChatMessages.id, data.messageId),
                  eq(jobChatMessages.jobId, data.jobId),
                  eq(jobChatMessages.senderId, data.senderId),
                  eq(jobChatMessages.isDeleted, false),
                ),
              )
              .returning({ id: jobChatMessages.id });

            if (!deleted) return;
            this.io
              ?.to(`job_${data.jobId}`)
              .emit("job_message_deleted", { id: deleted.id });
          } catch (error) {
            logger.error("Error deleting job message: " + error);
          }
        },
      );

      socket.on("send_candidate_message", async (data: { candidateId: number; senderId: number; message: string; replyToId?: number }) => {
        try {
          const [newMessage] = await db
            .insert(candidateChatMessages)
            .values({
              candidateId: data.candidateId,
              senderId: data.senderId,
              message: data.message,
              replyToId: data.replyToId,
            })
            .returning();

          // broadcast to the candidate room
          this.io?.to(`candidate_${data.candidateId}`).emit("new_candidate_message", newMessage);
        } catch (error) {
          logger.error("Error saving candidate message: " + error);
        }
      });

      socket.on("disconnect", () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }


  public notifyCandidateApplied(jobId: number) {
    this.io?.emit("candidate_applied", { jobId });
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

      this.io?.to(`job_${jobId}`).emit("new_job_message", newMessage);
    } catch (error) {
      logger.error("Error sending system job message: " + error);
    }
  }
}

export const socketService = SocketService.getInstance();
