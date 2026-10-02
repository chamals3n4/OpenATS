import { sql } from "drizzle-orm";
import { db } from "../../db";

/** A candidate counts as stalled once they have sat in one stage this many days. */
export const STALLED_AFTER_DAYS = 7;
const LIST_SIZE = 5;
const UPCOMING_DAYS = 7;

export type AttentionReport = {
  newApplicants: { last24h: number };
  offersAwaitingAnswer: {
    count: number;
    items: {
      offerId: number;
      candidateId: number;
      candidateName: string;
      jobTitle: string;
      sentAt: string;
    }[];
  };
  upcomingInterviews: {
    count: number;
    items: {
      interviewId: number;
      candidateId: number;
      candidateName: string;
      jobTitle: string;
      startsAt: string;
    }[];
  };
  stalledCandidates: {
    count: number;
    afterDays: number;
    items: {
      candidateId: number;
      candidateName: string;
      jobTitle: string;
      stageName: string;
      days: number;
    }[];
  };
};

/** First and last name in one string, tolerating a missing last name. */
export function joinName(first: string, last: string | null | undefined): string {
  return `${first} ${last ?? ""}`.trim();
}

/**
 * The interview's start: the time slot the candidate picked, else the older single scheduled
 * time. Slots are stored as ISO strings in a JSON list.
 */
const interviewStart = sql`COALESCE(
  (
    SELECT (slot->>'datetime')::timestamptz
    FROM jsonb_array_elements(COALESCE(i.time_slots, '[]'::jsonb)) AS slot
    WHERE (slot->>'selected')::boolean IS TRUE
    LIMIT 1
  ),
  i.scheduled_at
)`;

type Counted<T> = T & { total: string };

export const attentionService = {
  async get(departmentId?: number): Promise<AttentionReport> {
    const dept = departmentId ? sql` AND j.department_id = ${departmentId}` : sql``;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);
    const stalledBefore = new Date(now.getTime() - STALLED_AFTER_DAYS * 24 * 60 * 60 * 1000);

    const [applicants, offers, interviews, interviewCount, stalled] = await Promise.all([
      db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM candidates c
        INNER JOIN jobs j ON j.id = c.job_id
        WHERE c.applied_at >= ${dayAgo} ${dept}
      `),

      db.execute<
        Counted<{
          offer_id: number;
          candidate_id: number;
          first_name: string;
          last_name: string | null;
          job_title: string;
          sent_at: Date | string;
        }>
      >(sql`
        SELECT
          o.id AS offer_id, c.id AS candidate_id, c.first_name, c.last_name, j.title AS job_title,
          COALESCE(o.sent_at, o.created_at) AS sent_at,
          COUNT(*) OVER ()::text AS total
        FROM offers o
        INNER JOIN candidates c ON c.id = o.candidate_id
        INNER JOIN jobs j ON j.id = o.job_id
        WHERE o.status IN ('sent', 'viewed') ${dept}
        ORDER BY COALESCE(o.sent_at, o.created_at) ASC
        LIMIT ${LIST_SIZE}
      `),

      db.execute<{
        interview_id: number;
        candidate_id: number;
        first_name: string;
        last_name: string | null;
        job_title: string;
        starts_at: Date | string;
      }>(sql`
        SELECT * FROM (
          SELECT
            i.id AS interview_id, c.id AS candidate_id, c.first_name, c.last_name, j.title AS job_title,
            ${interviewStart} AS starts_at
          FROM candidate_interviews i
          INNER JOIN candidates c ON c.id = i.candidate_id
          INNER JOIN jobs j ON j.id = i.job_id
          WHERE i.status = 'scheduled' ${dept}
        ) upcoming
        WHERE starts_at >= ${now} AND starts_at < ${weekAhead}
        ORDER BY starts_at ASC
        LIMIT ${LIST_SIZE}
      `),

      // The count covers every upcoming interview, not just the five listed.
      db.execute<{ total: string }>(sql`
        SELECT COUNT(*)::text AS total FROM (
          SELECT ${interviewStart} AS starts_at
          FROM candidate_interviews i
          INNER JOIN jobs j ON j.id = i.job_id
          WHERE i.status = 'scheduled' ${dept}
        ) upcoming
        WHERE starts_at >= ${now} AND starts_at < ${weekAhead}
      `),

      db.execute<
        Counted<{
          candidate_id: number;
          first_name: string;
          last_name: string | null;
          job_title: string;
          stage_name: string;
          entered_at: Date | string;
        }>
      >(sql`
        SELECT * FROM (
          SELECT
            c.id AS candidate_id, c.first_name, c.last_name, j.title AS job_title, s.name AS stage_name,
            COALESCE(
              (SELECT MAX(h.moved_at) FROM candidate_stage_history h
               WHERE h.candidate_id = c.id AND h.stage_id = c.current_stage_id),
              c.applied_at
            ) AS entered_at
          FROM candidates c
          INNER JOIN jobs j ON j.id = c.job_id
          INNER JOIN job_pipeline_stages s ON s.id = c.current_stage_id
          WHERE c.status IN ('active', 'offered')
            AND j.status NOT IN ('closed', 'archived') ${dept}
        ) stalled
        WHERE entered_at < ${stalledBefore}
      `),
    ]);

    const offerRows = offers.rows;
    const interviewRows = interviews.rows;
    const stalledRows = [...stalled.rows].sort(
      (a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime(),
    );

    const iso = (d: Date | string) => new Date(d).toISOString();
    const daysSince = (d: Date | string) =>
      Math.max(0, Math.floor((now.getTime() - new Date(d).getTime()) / 86_400_000));

    return {
      newApplicants: { last24h: Number(applicants.rows[0]?.count ?? "0") },
      offersAwaitingAnswer: {
        count: Number(offerRows[0]?.total ?? "0"),
        items: offerRows.map((r) => ({
          offerId: r.offer_id,
          candidateId: r.candidate_id,
          candidateName: joinName(r.first_name, r.last_name),
          jobTitle: r.job_title,
          sentAt: iso(r.sent_at),
        })),
      },
      upcomingInterviews: {
        count: Number(interviewCount.rows[0]?.total ?? "0"),
        items: interviewRows.map((r) => ({
          interviewId: r.interview_id,
          candidateId: r.candidate_id,
          candidateName: joinName(r.first_name, r.last_name),
          jobTitle: r.job_title,
          startsAt: iso(r.starts_at),
        })),
      },
      stalledCandidates: {
        count: stalledRows.length,
        afterDays: STALLED_AFTER_DAYS,
        items: stalledRows.slice(0, LIST_SIZE).map((r) => ({
          candidateId: r.candidate_id,
          candidateName: joinName(r.first_name, r.last_name),
          jobTitle: r.job_title,
          stageName: r.stage_name,
          days: daysSince(r.entered_at),
        })),
      },
    };
  },
};
