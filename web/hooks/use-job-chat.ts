"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/types";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function useJobChat(jobId: number, enabled: boolean) {
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const localTempIdRef = useRef(-1);

  useEffect(() => {
    if (!enabled || !jobId) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_job", jobId);
    });

    socket.on("new_job_message", (msg: ChatMessage) => {
      setLiveMessages((prev) => {
        // Reconcile optimistic local messages for snappy UX.
        const optimisticIdx = prev.findIndex(
          (m) =>
            m.id < 0 &&
            m.senderId === msg.senderId &&
            (m.message ?? "") === (msg.message ?? ""),
        );
        if (optimisticIdx >= 0) {
          const next = prev.slice();
          next[optimisticIdx] = msg;
          return next;
        }
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("job_message_updated", (msg: ChatMessage) => {
      setLiveMessages((prev) => {
        const next = prev.slice();
        const idx = next.findIndex((m) => m.id === msg.id);
        if (idx >= 0) next[idx] = msg;
        else next.push(msg);
        return next;
      });
    });

    socket.on("job_message_deleted", (data: { id: number }) => {
      setLiveMessages((prev) => prev.filter((m) => m.id !== data.id));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setLiveMessages([]);
    };
  }, [jobId, enabled]);

  const sendMessage = (
    senderId: number,
    message: string,
    sender?: { name?: string; avatarUrl?: string | null },
  ) => {
    if (!message.trim() || !socketRef.current) return;
    const trimmed = message.trim();
    const tempId = localTempIdRef.current--;
    setLiveMessages((prev) => [
      ...prev,
      {
        id: tempId,
        message: trimmed,
        senderId,
        sentAt: new Date().toISOString(),
        isSystemMessage: false,
        senderName: sender?.name ?? null,
        senderAvatar: sender?.avatarUrl ?? null,
      },
    ]);
    socketRef.current.emit("send_job_message", {
      jobId,
      senderId,
      message: trimmed,
    });
  };

  const editMessage = (senderId: number, messageId: number, message: string) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("edit_job_message", {
      jobId,
      senderId,
      messageId,
      message,
    });
  };

  const deleteMessage = (senderId: number, messageId: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit("delete_job_message", { jobId, senderId, messageId });
  };

  return { liveMessages, sendMessage, editMessage, deleteMessage };
}
