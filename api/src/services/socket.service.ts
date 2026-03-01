import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { db } from "../db";
import { jobChatMessages, candidateChatMessages } from "../db/schema";
import { eq } from "drizzle-orm";

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
      console.log(`Socket connected: ${socket.id}`);

      // job room
      socket.on("join_job", (jobId: number) => {
        socket.join(`job_${jobId}`);
        console.log(`Socket ${socket.id} joined job room: job_${jobId}`);
      });

      // candidate room
      socket.on("join_candidate", (candidateId: number) => {
        socket.join(`candidate_${candidateId}`);
        console.log(`Socket ${socket.id} joined candidate room: candidate_${candidateId}`);
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

          // broadcast to the job room
          this.io?.to(`job_${data.jobId}`).emit("new_job_message", newMessage);
        } catch (error) {
          console.error("Error saving job message:", error);
        }
      });

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
          console.error("Error saving candidate message:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
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
      console.error("Error sending system job message:", error);
    }
  }
}

export const socketService = SocketService.getInstance();
