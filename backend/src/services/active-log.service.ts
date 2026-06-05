import type { Request, Response } from "express";
import { SQL, sql } from "drizzle-orm";
import { db } from "../db";

export type ActiveLogLevel = "info" | "warn" | "error" | "success";
export type StatusGroup = "all" | "2xx" | "4xx" | "5xx";
export type TimeWindow = "15m" | "1h" | "6h" | "24h";
export type ExportFormat = "csv" | "json";

export type ActiveLogFilters = {
  search?: string;
  level?: "all" | ActiveLogLevel;
  service?: "all" | string;
  statusGroup?: StatusGroup;
  windowSize?: TimeWindow;
  limit?: number;
  offset?: number;
};

type ActiveLogRow = {
  id: number;
  timestamp: Date | string;
  level: string;
  service: string;
  action: string;
  endpoint: string;
  actor: string;
  status_code: number;
  latency_ms: number;
  request_id: string;
  ip: string;
  device: string;
  meta: unknown;
};

let activeLogWriteDisabled = false;

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) return 200;
  return Math.min(Math.max(value, 1), 500);
}

function getWindowStart(windowSize?: TimeWindow): Date | null {
  if (!windowSize) return null;
  const now = Date.now();

  if (windowSize === "15m") return new Date(now - 15 * 60 * 1000);
  if (windowSize === "1h") return new Date(now - 60 * 60 * 1000);
  if (windowSize === "6h") return new Date(now - 6 * 60 * 60 * 1000);
  return new Date(now - 24 * 60 * 60 * 1000);
}

function toIso(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function normalizeFilters(
  filters: ActiveLogFilters,
): Required<ActiveLogFilters> {
  return {
    search: filters.search ?? "",
    level: filters.level ?? "all",
    service: filters.service ?? "all",
    statusGroup: filters.statusGroup ?? "all",
    windowSize: filters.windowSize ?? "24h",
    limit: clampLimit(filters.limit),
    offset: filters.offset && filters.offset > 0 ? filters.offset : 0,
  };
}

function buildWhereClause(filters: Required<ActiveLogFilters>): SQL {
  const clauses: SQL[] = [];

  const q = filters.search.trim();
  if (q) {
    const like = `%${q}%`;
    clauses.push(sql`(
      action ILIKE ${like}
      OR endpoint ILIKE ${like}
      OR actor ILIKE ${like}
      OR request_id ILIKE ${like}
      OR ip ILIKE ${like}
      OR device ILIKE ${like}
      OR service ILIKE ${like}
      OR CAST(status_code AS TEXT) ILIKE ${like}
    )`);
  }

  if (filters.level !== "all") clauses.push(sql`level = ${filters.level}`);
  if (filters.service !== "all")
    clauses.push(sql`service = ${filters.service}`);

  if (filters.statusGroup === "2xx")
    clauses.push(sql`status_code BETWEEN 200 AND 299`);
  if (filters.statusGroup === "4xx")
    clauses.push(sql`status_code BETWEEN 400 AND 499`);
  if (filters.statusGroup === "5xx")
    clauses.push(sql`status_code BETWEEN 500 AND 599`);

  const windowStart = getWindowStart(filters.windowSize);
  if (windowStart) clauses.push(sql`timestamp >= ${windowStart}`);

  if (!clauses.length) return sql``;
  return sql`WHERE ${sql.join(clauses, sql` AND `)}`;
}

function toCsv(rows: ActiveLogRow[]): string {
  const headers = [
    "id",
    "timestamp",
    "level",
    "service",
    "action",
    "endpoint",
    "actor",
    "statusCode",
    "latencyMs",
    "requestId",
    "ip",
    "device",
  ];

  const body = rows.map((row) => [
    row.id,
    toIso(row.timestamp),
    row.level,
    row.service,
    row.action,
    row.endpoint,
    row.actor,
    row.status_code,
    row.latency_ms,
    row.request_id,
    row.ip,
    row.device,
  ]);

  return [headers, ...body]
    .map((line) =>
      line
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

function detectDevice(userAgent?: string): string {
  if (!userAgent) return "Unknown / Unknown";

  const ua = userAgent.toLowerCase();

  if (ua.includes("undici") || ua.includes("node")) {
    return "Server / Node.js";
  }

  const browser = ua.includes("firefox")
    ? "Firefox"
    : ua.includes("edg")
      ? "Edge"
      : ua.includes("opr") || ua.includes("opera")
        ? "Opera"
        : ua.includes("safari") && !ua.includes("chrome")
          ? "Safari"
          : ua.includes("chrome") || ua.includes("chromium")
            ? "Chrome"
            : "Unknown";

  const os = ua.includes("windows")
    ? "Windows"
    : ua.includes("android")
      ? "Android"
      : ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")
        ? "iOS"
        : ua.includes("mac os") || ua.includes("macintosh")
          ? "macOS"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown";

  return `${browser} / ${os}`;
}

function normalizeIp(ip?: string): string {
  if (!ip) return "unknown";

  const clean = ip.trim();
  if (!clean) return "unknown";

  if (clean.startsWith("::ffff:")) {
    return clean.slice(7);
  }

  if (clean === "::1") {
    return "127.0.0.1";
  }

  return clean;
}

function resolveService(path: string): string {
  const clean = path.split("?")[0] ?? path;
  const parts = clean.split("/").filter(Boolean);

  const apiIndex = parts.indexOf("api");
  if (apiIndex >= 0 && parts[apiIndex + 1])
    return parts[apiIndex + 1] as string;

  return parts[0] ?? "system";
}

function inferLevel(statusCode: number): ActiveLogLevel {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400) return "warn";
  if (statusCode >= 200 && statusCode < 300) return "success";
  return "info";
}

export const activeLogService = {
  async create(log: {
    level: ActiveLogLevel;
    service: string;
    action: string;
    endpoint: string;
    actor: string;
    statusCode: number;
    latencyMs: number;
    requestId: string;
    ip: string;
    device: string;
    meta?: unknown;
  }) {
    if (activeLogWriteDisabled) return null;

    try {
      const result = await db.execute<ActiveLogRow>(sql`
        INSERT INTO active_logs (
          level,
          service,
          action,
          endpoint,
          actor,
          status_code,
          latency_ms,
          request_id,
          ip,
          device,
          meta
        )
        VALUES (
          ${log.level},
          ${log.service},
          ${log.action},
          ${log.endpoint},
          ${log.actor},
          ${log.statusCode},
          ${log.latencyMs},
          ${log.requestId},
          ${log.ip},
          ${log.device},
          ${log.meta ?? null}
        )
        RETURNING
          id,
          timestamp,
          level,
          service,
          action,
          endpoint,
          actor,
          status_code,
          latency_ms,
          request_id,
          ip,
          device,
          meta
      `);

      return result.rows[0] ?? null;
    } catch (error: any) {
      if (error?.code === "42P01") {
        activeLogWriteDisabled = true;
      }
      return null;
    }
  },

  async list(filtersInput: ActiveLogFilters) {
    const filters = normalizeFilters(filtersInput);
    const where = buildWhereClause(filters);

    const result = await db.execute<ActiveLogRow>(sql`
      SELECT
        id,
        timestamp,
        level,
        service,
        action,
        endpoint,
        actor,
        status_code,
        latency_ms,
        request_id,
        ip,
        device,
        meta
      FROM active_logs
      ${where}
      ORDER BY timestamp DESC
      LIMIT ${filters.limit}
      OFFSET ${filters.offset}
    `);

    return result.rows.map((row) => ({
      id: row.id,
      timestamp: toIso(row.timestamp),
      level: row.level,
      service: row.service,
      action: row.action,
      endpoint: row.endpoint,
      actor: row.actor,
      statusCode: row.status_code,
      latencyMs: row.latency_ms,
      requestId: row.request_id,
      ip: row.ip,
      device: row.device,
      meta: row.meta,
    }));
  },

  async getById(id: number) {
    const result = await db.execute<ActiveLogRow>(sql`
      SELECT
        id,
        timestamp,
        level,
        service,
        action,
        endpoint,
        actor,
        status_code,
        latency_ms,
        request_id,
        ip,
        device,
        meta
      FROM active_logs
      WHERE id = ${id}
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      timestamp: toIso(row.timestamp),
      level: row.level,
      service: row.service,
      action: row.action,
      endpoint: row.endpoint,
      actor: row.actor,
      statusCode: row.status_code,
      latencyMs: row.latency_ms,
      requestId: row.request_id,
      ip: row.ip,
      device: row.device,
      meta: row.meta,
    };
  },

  async export(filtersInput: ActiveLogFilters, format: ExportFormat) {
    const rows = await this.list({ ...filtersInput, limit: 500, offset: 0 });

    if (format === "json") {
      return {
        format,
        fileName: "active-logs.json",
        mimeType: "application/json",
        content: JSON.stringify(rows, null, 2),
      };
    }

    const csv = toCsv(
      rows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level,
        service: row.service,
        action: row.action,
        endpoint: row.endpoint,
        actor: row.actor,
        status_code: row.statusCode,
        latency_ms: row.latencyMs,
        request_id: row.requestId,
        ip: row.ip,
        device: row.device,
        meta: row.meta,
      })),
    );

    return {
      format: "csv" as const,
      fileName: "active-logs.csv",
      mimeType: "text/csv",
      content: csv,
    };
  },

  async captureFromRequest(req: Request, res: Response, startedAt: number) {
    const path = req.originalUrl || req.url;
    if (!path.startsWith("/api")) return;
    if (path.startsWith("/api/logs")) return;

    const latencyMs = Math.max(1, Date.now() - startedAt);
    const statusCode = res.statusCode;

    const forwarded = req.headers["x-forwarded-for"];
    const realIp = req.headers["x-real-ip"];
    const cfIp = req.headers["cf-connecting-ip"];

    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(",")[0];

    const realIpValue = Array.isArray(realIp) ? realIp[0] : realIp;
    const cfIpValue = Array.isArray(cfIp) ? cfIp[0] : cfIp;

    const ip = normalizeIp(cfIpValue ?? realIpValue ?? forwardedIp ?? req.ip);

    const userAgent = req.headers["user-agent"];
    const actor = req.user
      ? `${req.user.firstName} ${req.user.lastName}`.trim() || req.user.email
      : "Anonymous";

    await this.create({
      level: inferLevel(statusCode),
      service: resolveService(path),
      action: `${req.method} ${path}`,
      endpoint: path,
      actor,
      statusCode,
      latencyMs,
      requestId:
        (req.headers["x-request-id"] as string | undefined) ??
        `req_${Date.now().toString(36)}`,
      ip,
      device: detectDevice(Array.isArray(userAgent) ? userAgent[0] : userAgent),
      meta: {
        method: req.method,
      },
    });
  },
};
