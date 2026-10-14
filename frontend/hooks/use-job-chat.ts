"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Socket } from "socket.io-client";
import { toast } from "sonner";
import type { ChatMessage } from "@/types";
import { useSocketToken } from "@/components/providers/socket-auth-provider";
import { createAuthedSocket } from "@/lib/socket";

export const jobChatKey = (jobId: number) => ["chat", "job", jobId] as const;

type History = { data: ChatMessage[] } | undefined;

/** Live chat for a job. Socket events update the history cache. Sends wait until the room is joined */
export function useJobChat(jobId: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  // Messages typed before joining, sent once joined
  const pendingRef = useRef<string[]>([]);
  const [denied, setDenied] = useState(false);
  const token = useSocketToken();

  useEffect(() => {
    if (!enabled || !jobId || !token) return;

    const key = jobChatKey(jobId);
    const update = (change: (messages: ChatMessage[]) => ChatMessage[]) =>
      queryClient.setQueryData<History>(key, (current) => ({ data: change(current?.data ?? []) }));

    const socket = createAuthedSocket(token);
    socketRef.current = socket;
    joinedRef.current = false;
    // Reset for this job
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setDenied(false);

    const flush = () => {
      for (const message of pendingRef.current.splice(0)) {
        socket.emit("send_job_message", { jobId, message });
      }
    };

    // Join on every connect. Don't send until joined
    socket.on("connect", () => {
      joinedRef.current = false;
      socket.emit("join_job", jobId, (reply?: { ok?: boolean }) => {
        if (!reply?.ok) return;
        joinedRef.current = true;
        flush();
      });
    });

    socket.on("room_denied", () => {
      joinedRef.current = false;
      pendingRef.current = [];
      setDenied(true);
    });

    socket.on("write_denied", () => {
      toast.error("Your message could not be sent. Reopen the discussion and try again.");
    });

    socket.on("new_job_message", (msg: ChatMessage) => {
      update((messages) => (messages.some((m) => m.id === msg.id) ? messages : [...messages, msg]));
    });

    socket.on("job_message_updated", (msg: ChatMessage) => {
      update((messages) => messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
    });

    socket.on("job_message_deleted", (data: { id: number }) => {
      update((messages) => messages.filter((m) => m.id !== data.id));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
      pendingRef.current = [];
    };
  }, [jobId, enabled, token, queryClient]);

  const sendMessage = (message: string) => {
    const text = message.trim();
    if (!text) return;
    if (socketRef.current && joinedRef.current) {
      socketRef.current.emit("send_job_message", { jobId, message: text });
    } else {
      pendingRef.current.push(text);
    }
  };

  const editMessage = (messageId: number, message: string) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit("edit_job_message", { jobId, messageId, message: message.trim() });
  };

  const deleteMessage = (messageId: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit("delete_job_message", { jobId, messageId });
  };

  return { sendMessage, editMessage, deleteMessage, denied };
}
