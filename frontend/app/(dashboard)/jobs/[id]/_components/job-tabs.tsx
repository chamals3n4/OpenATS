"use client";

import { TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "./tabs/overview-tab";
import { HiringTeamTab } from "./tabs/hiring-team-tab";
import { HiringProcessTab } from "./tabs/hiring-process-tab";
import { CustomQuestionsTab } from "./tabs/custom-questions-tab";
import { ScoringTab } from "./tabs/scoring-tab";
import { AssessmentsTab } from "./tabs/assessments-tab";
import type { JobDetail } from "@/types";

interface JobTabsProps {
  jobId: number;
  job: JobDetail | undefined;
  jobLoading: boolean;
}

// Each tab loads its own data, and only while it is open
export function JobTabs({ jobId, job, jobLoading }: JobTabsProps) {
  return (
    <div className="pb-20 w-full">
      <TabsContent
        value="overview"
        className="pt-2 animate-in fade-in duration-300 max-w-4xl"
      >
        <OverviewTab job={job} jobLoading={jobLoading} />
      </TabsContent>

      <TabsContent
        value="hiring-team"
        className="pt-2 space-y-12 animate-in fade-in duration-300"
      >
        <HiringTeamTab jobId={jobId} />
      </TabsContent>

      <TabsContent
        value="hiring-process"
        className="pt-2 space-y-6 animate-in fade-in duration-300"
      >
        <HiringProcessTab jobId={jobId} />
      </TabsContent>

      <TabsContent value="custom-questions" className="pt-2">
        <CustomQuestionsTab jobId={jobId} />
      </TabsContent>

      <TabsContent value="scoring" className="pt-2">
        <ScoringTab job={job} />
      </TabsContent>

      <TabsContent value="assessments" className="pt-2 space-y-5">
        <AssessmentsTab jobId={jobId} />
      </TabsContent>
    </div>
  );
}
