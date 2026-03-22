"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  Search01Icon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveLogs } from "@/hooks/use-api";
import type {
  ActiveLog,
  ActiveLogLevel,
  ActiveLogStatusGroup,
  ActiveLogWindowSize,
} from "@/types";

type LogLevel = ActiveLogLevel;

const SERVICES = [
  "auth",
  "jobs",
  "candidates",
  "offers",
  "assessments",
  "chat",
] as const;

const LEVEL_LABELS: Record<"all" | LogLevel, string> = {
  all: "All Levels",
  info: "Info",
  success: "Success",
  warn: "Warning",
  error: "Error",
};

const STATUS_GROUP_LABELS: Record<ActiveLogStatusGroup, string> = {
  all: "All Statuses",
  "2xx": "2xx",
  "4xx": "4xx",
  "5xx": "5xx",
};

const WINDOW_LABELS: Record<ActiveLogWindowSize, string> = {
  "15m": "15m",
  "1h": "1h",
  "6h": "6h",
  "24h": "24h",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelDotClass(level: LogLevel): string {
  if (level === "error") return "bg-red-500";
  if (level === "warn") return "bg-amber-500";
  if (level === "success") return "bg-emerald-500";
  return "bg-sky-500";
}

export default function ActiveLogsPage() {
  const [isApiEnabled, setIsApiEnabled] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<"all" | LogLevel>("all");
  const [service, setService] = useState<"all" | (typeof SERVICES)[number]>(
    "all",
  );
  const [statusGroup, setStatusGroup] = useState<ActiveLogStatusGroup>("all");
  const [windowSize, setWindowSize] = useState<ActiveLogWindowSize>("24h");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const logsQuery = useActiveLogs(
    {
      search,
      level,
      service,
      statusGroup,
      windowSize,
      limit: 250,
      offset: 0,
    },
    {
      enabled: isApiEnabled,
      live: isLive,
    },
  );

  const filteredLogs = logsQuery.data ?? [];

  const serviceOptions = useMemo(() => {
    const set = new Set<string>(SERVICES);
    for (const log of filteredLogs) {
      if (log.service) set.add(log.service);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filteredLogs]);

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-neutral-950">
      <div className="px-8 py-4 flex items-center justify-between">
        <h1 className="text-[28px] font-medium text-slate-900 dark:text-neutral-100 leading-none">
          Active Logs
        </h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs font-medium text-slate-600 dark:text-neutral-300 bg-white dark:bg-neutral-900">
            <span
              className={`size-2 rounded-full ${isApiEnabled ? "bg-emerald-500" : "bg-red-500"}`}
            />
            {isApiEnabled ? "API ON" : "API OFF"}
          </span>
          <span className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 dark:border-neutral-800 text-xs font-medium text-slate-600 dark:text-neutral-300 bg-white dark:bg-neutral-900">
            <span
              className={`size-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
            />
            {isLive ? "Live Stream" : "Paused"}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setIsApiEnabled((prev) => {
                const next = !prev;
                if (!next) setIsLive(false);
                return next;
              });
            }}
            className="h-9 rounded-lg shadow-none"
          >
            {isApiEnabled ? "Stop API Calls" : "Start API Calls"}
          </Button>
          <Button
            variant="outline"
            disabled={!isApiEnabled}
            onClick={() => setIsLive((v) => !v)}
            className="h-9 rounded-lg shadow-none"
          >
            {isLive ? "Pause Stream" : "Resume Stream"}
          </Button>
        </div>
      </div>

      <div className="border-y border-slate-200 dark:border-neutral-800 px-8 py-3.5 flex items-center gap-3 flex-wrap">
        <div className="relative w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-300 pointer-events-none"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs, endpoint, request id, actor"
            className="pl-11 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-sm placeholder:text-slate-300 dark:placeholder:text-neutral-600"
          />
        </div>

        <Select
          value={level}
          onValueChange={(v) => setLevel((v as typeof level) ?? "all")}
        >
          <SelectTrigger className="w-36 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-600 dark:text-neutral-300 text-sm focus:ring-0 px-4">
            <SelectValue>{LEVEL_LABELS[level]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={service}
          onValueChange={(v) => setService((v as typeof service) ?? "all")}
        >
          <SelectTrigger className="w-44 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-600 dark:text-neutral-300 text-sm focus:ring-0 px-4">
            <SelectValue>
              {service === "all"
                ? "All Services"
                : `${service.charAt(0).toUpperCase()}${service.slice(1)}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Services</SelectItem>
            {serviceOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusGroup}
          onValueChange={(v) =>
            setStatusGroup((v as typeof statusGroup) ?? "all")
          }
        >
          <SelectTrigger className="w-32 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-600 dark:text-neutral-300 text-sm focus:ring-0 px-4">
            <SelectValue>{STATUS_GROUP_LABELS[statusGroup]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="2xx">2xx</SelectItem>
            <SelectItem value="4xx">4xx</SelectItem>
            <SelectItem value="5xx">5xx</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={windowSize}
          onValueChange={(v) =>
            setWindowSize((v as typeof windowSize) ?? "24h")
          }
        >
          <SelectTrigger className="w-32 h-10! bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-none rounded-lg text-slate-600 dark:text-neutral-300 text-sm focus:ring-0 px-4">
            <SelectValue>{WINDOW_LABELS[windowSize]}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-lg border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <SelectItem value="15m">15m</SelectItem>
            <SelectItem value="1h">1h</SelectItem>
            <SelectItem value="6h">6h</SelectItem>
            <SelectItem value="24h">24h</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          onClick={() => {
            setSearch("");
            setLevel("all");
            setService("all");
            setStatusGroup("all");
            setWindowSize("24h");
          }}
          className="h-10 px-3 text-sm"
        >
          Clear
        </Button>
      </div>

      <div className="px-8 py-6 flex flex-col gap-4">
        <div className="border border-slate-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-b border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-transparent">
                <TableHead className="w-40 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Time
                </TableHead>
                <TableHead className="w-42.5 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Result
                </TableHead>
                <TableHead className="w-27.5 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Service
                </TableHead>
                <TableHead className="w-60 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Action
                </TableHead>
                <TableHead className="w-45 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Endpoint
                </TableHead>
                <TableHead className="w-32.5 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  IP Address
                </TableHead>
                <TableHead className="w-35 px-4 py-3 text-[13px] font-semibold text-slate-700 dark:text-neutral-300">
                  Device
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-28 text-center text-slate-400 text-sm"
                  >
                    {logsQuery.isLoading
                      ? "Loading logs..."
                      : !isApiEnabled
                        ? "API calls are stopped. Click Start API Calls to resume."
                        : logsQuery.isError
                          ? "Failed to load logs."
                          : "No logs found for current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <Fragment key={log.id}>
                    <TableRow
                      onClick={() =>
                        setExpandedLogId((prev) =>
                          prev === log.id ? null : log.id,
                        )
                      }
                      className="border-b border-slate-300 dark:border-neutral-700 last:border-0 cursor-pointer"
                    >
                      <TableCell className="px-4 py-3 text-[13px] text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="h-6 rounded-md gap-1.5 border-slate-200 dark:border-neutral-700"
                          >
                            <span
                              className={`size-1.5 rounded-full ${levelDotClass(log.level)}`}
                            />
                            <span className="uppercase text-[10px]">
                              {log.level}
                            </span>
                          </Badge>
                          <span
                            className={`inline-flex items-center h-6 px-2 rounded-md font-semibold text-xs ${
                              log.statusCode >= 500
                                ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                                : log.statusCode >= 400
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            }`}
                          >
                            {log.statusCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] font-medium text-slate-700 dark:text-neutral-300 truncate">
                        {log.service}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-slate-700 dark:text-neutral-300">
                        <div className="flex items-center gap-2 min-w-0">
                          {log.level === "error" ? (
                            <HugeiconsIcon
                              icon={Alert02Icon}
                              className="size-4 text-red-500"
                            />
                          ) : log.level === "warn" ? (
                            <HugeiconsIcon
                              icon={Loading03Icon}
                              className="size-4 text-amber-500"
                            />
                          ) : log.level === "success" ? (
                            <HugeiconsIcon
                              icon={CheckmarkCircle02Icon}
                              className="size-4 text-emerald-500"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={InformationCircleIcon}
                              className="size-4 text-sky-500"
                            />
                          )}
                          <span className="truncate">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] font-mono text-slate-600 dark:text-neutral-400 truncate">
                        {log.endpoint}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] font-mono text-slate-600 dark:text-neutral-400 truncate">
                        {log.ip}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[13px] text-slate-600 dark:text-neutral-400 truncate">
                        {log.device}
                      </TableCell>
                    </TableRow>

                    {expandedLogId === log.id && (
                      <TableRow
                        key={`${log.id}-details`}
                        className="bg-slate-50/70 dark:bg-neutral-900/40"
                      >
                        <TableCell colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-slate-400 dark:text-neutral-500">
                                Request ID
                              </p>
                              <p className="font-mono text-slate-700 dark:text-neutral-300 mt-1">
                                {log.requestId}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-neutral-500">
                                Timestamp (ISO)
                              </p>
                              <p className="font-mono text-slate-700 dark:text-neutral-300 mt-1">
                                {log.timestamp}
                              </p>
                              <p className="text-slate-500 dark:text-neutral-400 mt-1">
                                Actor:{" "}
                                <span className="font-medium text-slate-700 dark:text-neutral-300">
                                  {log.actor}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 dark:text-neutral-500">
                                Details
                              </p>
                              <p className="text-slate-700 dark:text-neutral-300 mt-1">
                                {log.action} on {log.endpoint} by {log.actor}
                              </p>
                              <p className="text-slate-500 dark:text-neutral-400 mt-1">
                                Latency:{" "}
                                <span className="font-medium text-slate-700 dark:text-neutral-300">
                                  {log.latencyMs}ms
                                </span>
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>

          <div className="px-4 py-3 border-t border-slate-300 dark:border-neutral-700 flex items-center justify-between text-[13px] text-slate-500 dark:text-neutral-400">
            <span>Showing {filteredLogs.length} log entries</span>
            <span className="inline-flex items-center gap-1.5">
              <HugeiconsIcon icon={Time01Icon} className="size-3.5" />
              {!isApiEnabled
                ? "API polling stopped"
                : logsQuery.isFetching
                  ? "Updating..."
                  : "Synced with server"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
