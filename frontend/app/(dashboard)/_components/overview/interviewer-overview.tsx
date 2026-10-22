"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { ListSectionSpinner } from "@/components/dashboard-main-loading";
import { useInterviews } from "@/hooks/queries/use-interviews";
import { useCurrentUser } from "@/hooks/queries/use-user";
import type { InterviewListItem } from "@/types";
import { daysAgo, interviewWhen } from "../../_lib/overview-utils";
import { Card, cardCls } from "./card";

const WEEK_MS = 7 * 86_400_000;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const candidateHref = (interview: InterviewListItem) =>
  `/candidates/${interview.candidateId}?section=interviews`;

function Count({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  return (
    <div className={`${cardCls} px-5 py-4`}>
      <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "amber" && value > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-neutral-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-6 text-center">
      <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-6 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
      <p className="text-sm text-slate-600 dark:text-neutral-400">{text}</p>
    </div>
  );
}

function Row({ interview, meta, action }: { interview: InterviewListItem; meta: string; action: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-2 py-3">
      <div className="min-w-0">
        <Link
          href={candidateHref(interview)}
          className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-neutral-100"
        >
          {interview.candidateName}
        </Link>
        <p className="truncate text-sm text-slate-500 dark:text-neutral-400">
          {[interview.eventName, interview.jobTitle].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm text-slate-600 dark:text-neutral-400">{meta}</span>
        {action}
      </div>
    </li>
  );
}

/** The interviewer's overview: what they have to do, not company figures. */
export function InterviewerOverview() {
  const { data: me } = useCurrentUser();
  const { data, isLoading, isError, refetch } = useInterviews();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const myId = me?.data?.id;
  const { due, upcoming, today } = useMemo(() => {
    // Only the interviews they run, not every interview on their jobs
    const mine = (data?.data ?? []).filter(
      (i) => i.interviewerId === myId && i.status !== "cancelled" && i.scheduledAt,
    );
    const at = (i: InterviewListItem) => new Date(i.scheduledAt!).getTime();
    return {
      due: mine
        .filter((i) => at(i) < now && !i.myScorecardSubmitted)
        .sort((a, b) => at(a) - at(b)),
      upcoming: mine
        .filter((i) => i.status === "scheduled" && at(i) >= now && at(i) < now + WEEK_MS)
        .sort((a, b) => at(a) - at(b)),
      today: mine.filter((i) => i.status === "scheduled" && sameDay(new Date(at(i)), new Date(now))).length,
    };
  }, [data, myId, now]);

  return (
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold leading-none text-slate-900 dark:text-neutral-100">
            {me?.data?.firstName ? `Hi ${me.data.firstName}` : "Hi there"} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Your interviews and the scorecards waiting on you.</p>
        </div>

        {isError && !data ? (
          <div role="alert" className={`${cardCls} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Your interviews could not be loaded.</p>
            <Button variant="cancel" className="h-8 px-3 text-sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : isLoading || !me ? (
          <ListSectionSpinner />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Count label="Interviews today" value={today} />
              <Count label="Next 7 days" value={upcoming.length} />
              <Count label="Scorecards due" value={due.length} tone="amber" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Scorecards to submit" subtitle="Interviews you ran that still need your scorecard">
                {due.length === 0 ? (
                  <Empty text="You're all caught up." />
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
                    {due.map((interview) => (
                      <Row
                        key={interview.id}
                        interview={interview}
                        meta={`${daysAgo(interview.scheduledAt!, now) === 0 ? "Today" : `${daysAgo(interview.scheduledAt!, now)}d ago`}`}
                        action={
                          <Button
                            render={<Link href={candidateHref(interview)} />}
                            className="h-8 border-none bg-theme px-3 text-sm font-medium text-white hover:bg-theme-hover"
                          >
                            Submit scorecard
                          </Button>
                        }
                      />
                    ))}
                  </ul>
                )}
              </Card>

              <Card
                title="Upcoming interviews"
                subtitle="The next 7 days"
                action={
                  <Link href="/interviews" className="shrink-0 text-sm font-medium text-theme hover:underline dark:text-primary">
                    All interviews
                  </Link>
                }
              >
                {upcoming.length === 0 ? (
                  <Empty text="Nothing booked for the next 7 days." />
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
                    {upcoming.map((interview) => (
                      <Row
                        key={interview.id}
                        interview={interview}
                        meta={interviewWhen(interview.scheduledAt!, now)}
                        action={
                          interview.meetingUrl ? (
                            <Button
                              variant="cancel"
                              render={<a href={interview.meetingUrl} target="_blank" rel="noopener noreferrer" />}
                              className="h-8 gap-1.5 px-3 text-sm"
                            >
                              <HugeiconsIcon icon={Video01Icon} className="size-4" />
                              Join
                            </Button>
                          ) : null
                        }
                      />
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
