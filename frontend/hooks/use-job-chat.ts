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

/**
 * The live side of a job's team discussion. Messages are kept in one place: the history query's
 * cache. What arrives over the socket is written into that cache, not into a list of its own, so
 * a message that was sent, edited or deleted while the panel was open is still right after it is
 * closed and opened again.
 *
 * Messages are only sent once the server has let this connection into the job's room. Sending
 * straight after the panel opens used to race the join, and the server refused the message
 * without anyone seeing why.
 */
export function useJobChat(jobId: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  // Typed before the join was confirmed. Sent, in order, as soon as it is.
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
    // Reset for this connection, so a message typed on another job is never carried over.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setDenied(false);

    const flush = () => {
      for (const message of pendingRef.current.splice(0)) {
        socket.emit("send_job_message", { jobId, message });
      }
    };

    // Re-joined on every connect, so a reconnect restores the room too. Until the server answers,
    // nothing is sent.
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
