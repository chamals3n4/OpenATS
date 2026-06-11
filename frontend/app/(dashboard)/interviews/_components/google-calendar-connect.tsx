"use client";

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { serverFetch } from "@/lib/auth-action";

export function GoogleCalendarConnect() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serverFetch<{ data: { connected: boolean } }>("/google/status")
      .then((res) => setConnected(res.data.connected))
      .catch(() => setConnected(false))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/google/auth";
  };

  const handleDisconnect = async () => {
    try {
      await serverFetch<{ data: { disconnected: boolean } }>(
        "/google/disconnect",
        { method: "DELETE" },
      );
      setConnected(false);
    } catch {}
  };

  if (loading) return null;

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-slate-600 dark:text-neutral-400">
          <span className="size-2 rounded-full bg-emerald-500" />
          Google Calendar connected
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDisconnect}
          className="h-[34px] rounded-md border-slate-200 px-3 text-[13px] font-semibold text-slate-600 shadow-none hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-400"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={handleConnect}
      className="h-[34px] rounded-md border-none bg-neutral-700 px-4 text-[14px] font-semibold leading-none text-white shadow-none hover:bg-neutral-600"
    >
      <HugeiconsIcon icon={Calendar02Icon} className="size-4" />
      Connect Google Calendar
    </Button>
  );
}
