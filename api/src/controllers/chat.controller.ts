import { Request, Response } from "express";
import { db } from "../db";
import { jobChatMessages, candidateChatMessages, users } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";

export const getJobChatHistory = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const messages = await db
      .select({
        id: jobChatMessages.id,
        message: jobChatMessages.message,
        senderId: jobChatMessages.senderId,
        sentAt: jobChatMessages.sentAt,
        isSystemMessage: jobChatMessages.isSystemMessage,
        senderName: users.firstName,
        senderAvatar: users.avatarUrl,
      })
      .from(jobChatMessages)
      .leftJoin(users, eq(jobChatMessages.senderId, users.id))
      .where(
        and(
          eq(jobChatMessages.jobId, Number(jobId)),
          eq(jobChatMessages.isDeleted, false)
        )
      )
      .orderBy(desc(jobChatMessages.sentAt));

    res.status(200).json({ data: messages });
  } catch (error) {
    console.error("Error fetching job chat history:", error);
    res.status(500).json({ error: "Failed to fetch job chat history" });
  }
};

export const getCandidateChatHistory = async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;

    const messages = await db
      .select({
        id: candidateChatMessages.id,
        message: candidateChatMessages.message,
        senderId: candidateChatMessages.senderId,
        sentAt: candidateChatMessages.sentAt,
        isSystemMessage: candidateChatMessages.isSystemMessage,
        senderName: users.firstName,
        senderAvatar: users.avatarUrl,
      })
      .from(candidateChatMessages)
      .leftJoin(users, eq(candidateChatMessages.senderId, users.id))
      .where(
        and(
          eq(candidateChatMessages.candidateId, Number(candidateId)),
          eq(candidateChatMessages.isDeleted, false)
        )
      )
      .orderBy(desc(candidateChatMessages.sentAt));

    res.status(200).json({ data: messages });
  } catch (error) {
    console.error("Error fetching candidate chat history:", error);
    res.status(500).json({ error: "Failed to fetch candidate chat history" });
  }
};
