"use client";

import { useRole } from "@/hooks/use-role";
import { InterviewerOverview } from "./_components/overview/interviewer-overview";
import { OverviewClient } from "./overview-client";

// Managers get the hiring figures; an interviewer gets their own interviews and scorecards
export default function OverviewPage() {
  const { role, isInterviewer } = useRole();
  if (!role) return null;
  return isInterviewer ? <InterviewerOverview /> : <OverviewClient />;
}
