import { db } from "../../db";
import { sql } from "drizzle-orm";

export type ReportPeriod = "7d" | "30d" | "90d";
export type ExportFormat = "csv" | "json";

type PipelineRow = { stage: string; current: number; previous: number };
type VolumeRow = { date: string; applications: number; hires: number };
type SourceRow = { name: string; value: number };
type DeptHireRow = { dept: string; days: number };
type OfferTrendRow = { month: string; sent: number; accepted: number };

export type AnalyticsReport = {
  summary: {
    totalCandidates: number;
    totalCandidatesDeltaPct: number;
    openPositions: number;
    openPositionsDelta: number;
    avgTimeToHireDays: number;
    avgTimeToHireDeltaDays: number;
    offerAcceptanceRate: number;
    offerAcceptanceRateDeltaPct: number;
  };
  pipelineReport: PipelineRow[];
  candidateVolume: VolumeRow[];
  sourceOfCandidates: SourceRow[];
  timeToHireByDepartment: DeptHireRow[];
  offerTrends: OfferTrendRow[];
};

function getPeriodDays(period: ReportPeriod): number {
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return 7;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function safePct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return round(((current - previous) / previous) * 100, 1);
}

function toDayKey(input: Date): string {
  return input.toISOString().slice(0, 10);
}

function monthLabel(input: Date): string {
  return input.toLocaleDateString("en-US", { month: "short" });
}

function shortDateLabel(input: Date): string {
  return input.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildDateBuckets(
  start: Date,
  end: Date,
  bucketCount = 6,
): Array<{ start: Date; end: Date; label: string }> {
  const totalMs = end.getTime() - start.getTime();
  const size = Math.max(1, Math.floor(totalMs / bucketCount));

  const buckets: Array<{ start: Date; end: Date; label: string }> = [];
  let cursor = new Date(start);

  for (let i = 0; i < bucketCount; i++) {
    const next =
      i === bucketCount - 1 ? new Date(end) : new Date(cursor.getTime() + size);
    buckets.push({
      start: new Date(cursor),
      end: new Date(next),
      label: shortDateLabel(cursor),
    });
    cursor = next;
  }

  return buckets;
}

function buildCsv(report: AnalyticsReport): string {
  const rows: Array<Array<string | number>> = [
    ["=== Summary ==="],
    ["Metric", "Value"],
    ["Total Candidates", report.summary.totalCandidates],
    ["Open Positions", report.summary.openPositions],
    ["Avg. Time To Hire (Days)", report.summary.avgTimeToHireDays],
    ["Offer Acceptance Rate (%)", report.summary.offerAcceptanceRate],
    [],
    ["=== Pipeline Report ==="],
    ["Stage", "This Period", "Previous Period"],
    ...report.pipelineReport.map((d) => [d.stage, d.current, d.previous]),
    [],
    ["=== Candidate Volume ==="],
    ["Date", "Applications", "Hires"],
    ...report.candidateVolume.map((d) => [d.date, d.applications, d.hires]),
    [],
    ["=== Source of Candidates ==="],
    ["Source", "Percentage"],
    ...report.sourceOfCandidates.map((d) => [d.name, `${d.value}%`]),
    [],
    ["=== Time to Hire by Dept ==="],
    ["Department", "Avg Days"],
    ...report.timeToHireByDepartment.map((d) => [d.dept, d.days]),
    [],
    ["=== Offer Trends ==="],
    ["Month", "Sent", "Accepted"],
    ...report.offerTrends.map((d) => [d.month, d.sent, d.accepted]),
  ];

  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
}

type AnalyticsCacheEntry = {
  value: AnalyticsReport;
  expiresAt: number;
};

// Simple in-memory cache to make the dashboard overview feel fast.
// Analytics is aggregated data; we cache briefly and refresh on expiry.
const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const ANALYTICS_CACHE_TTL_MS = 60_000;

export const reportService = {
  async getAnalytics(
    period: ReportPeriod,
    departmentId?: number,
  ): Promise<AnalyticsReport> {
    const cacheKey = `${period}|${departmentId ?? "all"}`;
    const cached = analyticsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const days = getPeriodDays(period);

    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(
      currentStart.getTime() - days * 24 * 60 * 60 * 1000,
    );

    const deptFilter = departmentId
      ? sql` AND j.department_id = ${departmentId}`
      : sql``;

    const totalCandidatesRes = await db.execute<{
      count: string;
    }>(sql`
      SELECT COUNT(*)::text AS count
      FROM candidates c
      INNER JOIN jobs j ON j.id = c.job_id
      WHERE 1=1 ${deptFilter}
    `);

    const candidatePeriodRes = await db.execute<{
      current_count: string;
      previous_count: string;
    }>(sql`
      SELECT
        SUM(CASE WHEN c.applied_at >= ${currentStart} AND c.applied_at < ${now} THEN 1 ELSE 0 END)::text AS current_count,
        SUM(CASE WHEN c.applied_at >= ${previousStart} AND c.applied_at < ${currentStart} THEN 1 ELSE 0 END)::text AS previous_count
      FROM candidates c
      INNER JOIN jobs j ON j.id = c.job_id
      WHERE 1=1 ${deptFilter}
    `);

    const openPositionRes = await db.execute<{
      open_count: string;
      current_opened: string;
      previous_opened: string;
    }>(sql`
      SELECT
        SUM(CASE WHEN j.status NOT IN ('closed', 'archived') THEN 1 ELSE 0 END)::text AS open_count,
        SUM(CASE WHEN j.created_at >= ${currentStart} AND j.created_at < ${now} THEN 1 ELSE 0 END)::text AS current_opened,
        SUM(CASE WHEN j.created_at >= ${previousStart} AND j.created_at < ${currentStart} THEN 1 ELSE 0 END)::text AS previous_opened
      FROM jobs j
      WHERE 1=1 ${deptFilter}
    `);

    const hireTimeRes = await db.execute<{
      current_days: string | null;
      previous_days: string | null;
    }>(sql`
      SELECT
        AVG(CASE
          WHEN o.status = 'accepted' AND o.updated_at >= ${currentStart} AND o.updated_at < ${now}
          THEN EXTRACT(EPOCH FROM (o.updated_at - c.applied_at)) / 86400.0
          ELSE NULL
        END)::text AS current_days,
        AVG(CASE
          WHEN o.status = 'accepted' AND o.updated_at >= ${previousStart} AND o.updated_at < ${currentStart}
          THEN EXTRACT(EPOCH FROM (o.updated_at - c.applied_at)) / 86400.0
          ELSE NULL
        END)::text AS previous_days
      FROM offers o
      INNER JOIN candidates c ON c.id = o.candidate_id
      INNER JOIN jobs j ON j.id = o.job_id
      WHERE 1=1 ${deptFilter}
    `);

    const offerRateRes = await db.execute<{
      current_sent: string;
      current_accepted: string;
      previous_sent: string;
      previous_accepted: string;
    }>(sql`
      SELECT
        SUM(CASE WHEN COALESCE(o.sent_at, o.created_at) >= ${currentStart} AND COALESCE(o.sent_at, o.created_at) < ${now} THEN 1 ELSE 0 END)::text AS current_sent,
        SUM(CASE WHEN COALESCE(o.sent_at, o.created_at) >= ${currentStart} AND COALESCE(o.sent_at, o.created_at) < ${now} AND o.status = 'accepted' THEN 1 ELSE 0 END)::text AS current_accepted,
        SUM(CASE WHEN COALESCE(o.sent_at, o.created_at) >= ${previousStart} AND COALESCE(o.sent_at, o.created_at) < ${currentStart} THEN 1 ELSE 0 END)::text AS previous_sent,
        SUM(CASE WHEN COALESCE(o.sent_at, o.created_at) >= ${previousStart} AND COALESCE(o.sent_at, o.created_at) < ${currentStart} AND o.status = 'accepted' THEN 1 ELSE 0 END)::text AS previous_accepted
      FROM offers o
      INNER JOIN jobs j ON j.id = o.job_id
      WHERE 1=1 ${deptFilter}
    `);

    const pipelineRes = await db.execute<{
      stage: string;
      current_count: string;
      previous_count: string;
      stage_position: number;
    }>(sql`
      SELECT
        s.name AS stage,
        SUM(CASE WHEN h.moved_at >= ${currentStart} AND h.moved_at < ${now} THEN 1 ELSE 0 END)::text AS current_count,
        SUM(CASE WHEN h.moved_at >= ${previousStart} AND h.moved_at < ${currentStart} THEN 1 ELSE 0 END)::text AS previous_count,
        MIN(s.position)::int AS stage_position
      FROM candidate_stage_history h
      INNER JOIN job_pipeline_stages s ON s.id = h.stage_id
      INNER JOIN jobs j ON j.id = s.job_id
      WHERE 1=1 ${deptFilter}
      GROUP BY s.name
      ORDER BY stage_position ASC
    `);

    const appByDayRes = await db.execute<{
      day_key: string;
      count: string;
    }>(sql`
      SELECT
        TO_CHAR(c.applied_at::date, 'YYYY-MM-DD') AS day_key,
        COUNT(*)::text AS count
      FROM candidates c
      INNER JOIN jobs j ON j.id = c.job_id
      WHERE c.applied_at >= ${currentStart} AND c.applied_at < ${now}
      ${deptFilter}
      GROUP BY c.applied_at::date
      ORDER BY c.applied_at::date ASC
    `);

    const hireByDayRes = await db.execute<{
      day_key: string;
      count: string;
    }>(sql`
      SELECT
        TO_CHAR(o.updated_at::date, 'YYYY-MM-DD') AS day_key,
        COUNT(*)::text AS count
      FROM offers o
      INNER JOIN jobs j ON j.id = o.job_id
      WHERE o.status = 'accepted'
        AND o.updated_at >= ${currentStart}
        AND o.updated_at < ${now}
      ${deptFilter}
      GROUP BY o.updated_at::date
      ORDER BY o.updated_at::date ASC
    `);

    const sourceRes = await db.execute<{
      source_name: string;
      count: string;
    }>(sql`
      SELECT
        s.name AS source_name,
        COUNT(*)::text AS count
      FROM candidates c
      INNER JOIN job_pipeline_stages s ON s.id = c.current_stage_id
      INNER JOIN jobs j ON j.id = c.job_id
      WHERE 1=1
      ${deptFilter}
      GROUP BY s.name
      ORDER BY COUNT(*) DESC
    `);

    const deptHireRes = await db.execute<{
      department_name: string;
      avg_days: string | null;
    }>(sql`
      SELECT
        d.name AS department_name,
        AVG(EXTRACT(EPOCH FROM (o.updated_at - c.applied_at)) / 86400.0)::text AS avg_days
      FROM offers o
      INNER JOIN candidates c ON c.id = o.candidate_id
      INNER JOIN jobs j ON j.id = o.job_id
      INNER JOIN departments d ON d.id = j.department_id
      WHERE o.status = 'accepted'
      ${deptFilter}
      GROUP BY d.name
      ORDER BY d.name ASC
    `);

    const monthStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    const offerTrendRes = await db.execute<{
      month_key: string;
      sent_count: string;
      accepted_count: string;
    }>(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', COALESCE(o.sent_at, o.created_at)), 'YYYY-MM') AS month_key,
        COUNT(*)::text AS sent_count,
        SUM(CASE WHEN o.status = 'accepted' THEN 1 ELSE 0 END)::text AS accepted_count
      FROM offers o
      INNER JOIN jobs j ON j.id = o.job_id
      WHERE COALESCE(o.sent_at, o.created_at) >= ${monthStart}
      ${deptFilter}
      GROUP BY DATE_TRUNC('month', COALESCE(o.sent_at, o.created_at))
      ORDER BY DATE_TRUNC('month', COALESCE(o.sent_at, o.created_at)) ASC
    `);

    const totalCandidates = Number(totalCandidatesRes.rows[0]?.count ?? "0");

    const currentCandidates = Number(
      candidatePeriodRes.rows[0]?.current_count ?? "0",
    );
    const previousCandidates = Number(
      candidatePeriodRes.rows[0]?.previous_count ?? "0",
    );

    const openPositions = Number(openPositionRes.rows[0]?.open_count ?? "0");
    const currentOpened = Number(
      openPositionRes.rows[0]?.current_opened ?? "0",
    );
    const previousOpened = Number(
      openPositionRes.rows[0]?.previous_opened ?? "0",
    );

    const currentHireDays = Number(hireTimeRes.rows[0]?.current_days ?? "0");
    const previousHireDays = Number(hireTimeRes.rows[0]?.previous_days ?? "0");

    const currentSent = Number(offerRateRes.rows[0]?.current_sent ?? "0");
    const currentAccepted = Number(
      offerRateRes.rows[0]?.current_accepted ?? "0",
    );
    const previousSent = Number(offerRateRes.rows[0]?.previous_sent ?? "0");
    const previousAccepted = Number(
      offerRateRes.rows[0]?.previous_accepted ?? "0",
    );

    const currentOfferRate =
      currentSent > 0 ? (currentAccepted / currentSent) * 100 : 0;
    const previousOfferRate =
      previousSent > 0 ? (previousAccepted / previousSent) * 100 : 0;

    const pipelineReport: PipelineRow[] = pipelineRes.rows.map((row) => ({
      stage: row.stage,
      current: Number(row.current_count ?? "0"),
      previous: Number(row.previous_count ?? "0"),
    }));

    const appCountByDay = new Map<string, number>();
    appByDayRes.rows.forEach((row) => {
      appCountByDay.set(row.day_key, Number(row.count ?? "0"));
    });

    const hireCountByDay = new Map<string, number>();
    hireByDayRes.rows.forEach((row) => {
      hireCountByDay.set(row.day_key, Number(row.count ?? "0"));
    });

    const buckets = buildDateBuckets(currentStart, now, 6);
    const candidateVolume: VolumeRow[] = buckets.map((bucket) => {
      let applications = 0;
      let hires = 0;

      for (
        let d = new Date(bucket.start);
        d < bucket.end;
        d.setDate(d.getDate() + 1)
      ) {
        const key = toDayKey(d);
        applications += appCountByDay.get(key) ?? 0;
        hires += hireCountByDay.get(key) ?? 0;
      }

      return {
        date: bucket.label,
        applications,
        hires,
      };
    });

    const sourceCounts = sourceRes.rows.map((row) => ({
      name: row.source_name,
      count: Number(row.count ?? "0"),
    }));

    const sourceTotal = sourceCounts.reduce((sum, item) => sum + item.count, 0);
    const sourceOfCandidates: SourceRow[] =
      sourceTotal > 0
        ? sourceCounts.map((item) => ({
            name: item.name,
            value: round((item.count / sourceTotal) * 100, 0),
          }))
        : [{ name: "Website", value: 100 }];

    const timeToHireByDepartment: DeptHireRow[] = deptHireRes.rows.map(
      (row) => ({
        dept: row.department_name,
        days: round(Number(row.avg_days ?? "0"), 1),
      }),
    );

    const trendMap = new Map<string, { sent: number; accepted: number }>();
    offerTrendRes.rows.forEach((row) => {
      trendMap.set(row.month_key, {
        sent: Number(row.sent_count ?? "0"),
        accepted: Number(row.accepted_count ?? "0"),
      });
    });

    const offerTrends: OfferTrendRow[] = [];
    for (let i = 4; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      const data = trendMap.get(monthKey) ?? { sent: 0, accepted: 0 };
      offerTrends.push({
        month: monthLabel(monthDate),
        sent: data.sent,
        accepted: data.accepted,
      });
    }

    const report: AnalyticsReport = {
      summary: {
        totalCandidates,
        totalCandidatesDeltaPct: safePct(currentCandidates, previousCandidates),
        openPositions,
        openPositionsDelta: currentOpened - previousOpened,
        avgTimeToHireDays: round(currentHireDays, 1),
        avgTimeToHireDeltaDays: round(previousHireDays - currentHireDays, 1),
        offerAcceptanceRate: round(currentOfferRate, 1),
        offerAcceptanceRateDeltaPct: round(
          currentOfferRate - previousOfferRate,
          1,
        ),
      },
      pipelineReport,
      candidateVolume,
      sourceOfCandidates,
      timeToHireByDepartment,
      offerTrends,
    };

    analyticsCache.set(cacheKey, {
      value: report,
      expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
    });

    return report;
  },

  async exportAnalytics(
    period: ReportPeriod,
    format: ExportFormat,
    departmentId?: number,
  ) {
    const report = await this.getAnalytics(period, departmentId);

    if (format === "json") {
      const fileName = `openats-report-${period}.json`;
      return {
        format,
        fileName,
        mimeType: "application/json",
        content: JSON.stringify(report, null, 2),
      };
    }

    const fileName = `openats-report-${period}.csv`;
    return {
      format: "csv" as const,
      fileName,
      mimeType: "text/csv",
      content: buildCsv(report),
    };
  },
};
