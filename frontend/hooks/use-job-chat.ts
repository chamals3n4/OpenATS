"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChatMessage } from "@/types";
import { useSocketToken } from "@/components/providers/socket-auth-provider";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function useJobChat(jobId: number, enabled: boolean) {
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const token = useSocketToken();

  useEffect(() => {
    if (!enabled || !jobId || !token) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_job", jobId);
    });

    socket.on("new_job_message", (msg: ChatMessage) => {
      setLiveMessages((prev) => [...prev, msg]);
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
  }, [jobId, enabled, token]);

  const sendMessage = (message: string) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("send_job_message", { jobId, message });
  };

  const editMessage = (messageId: number, message: string) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("edit_job_message", { jobId, messageId, message });
  };

  const deleteMessage = (messageId: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit("delete_job_message", { jobId, messageId });
  };

  return { liveMessages, sendMessage, editMessage, deleteMessage };
}
