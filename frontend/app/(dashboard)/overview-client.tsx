"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/hooks/queries/use-company";
import {
  useAnalyticsReport,
  useAttentionReport,
  useExportAnalyticsReport,
} from "@/hooks/queries/use-reports";
import { useCurrentUser } from "@/hooks/queries/use-user";
import { PipelineChart, VolumeChart } from "./_components/charts";
import { AttentionPanel } from "./_components/overview/attention-panel";
import { Card, cardCls } from "./_components/overview/card";
import { ExportDialog, type ExportFormat } from "./_components/overview/export-dialog";
import { KpiCards } from "./_components/overview/kpi-cards";
import { OverviewHeader } from "./_components/overview/overview-header";
import { buildKpis, periodOf, type Period } from "./_lib/overview-utils";

/** The overview for hiring managers and super admins: what needs them, the key figures and one trend. */
export function OverviewClient() {
  const { data: me } = useCurrentUser();
  const [period, setPeriod] = useState<Period>("7d");
  const [dept, setDept] = useState("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");

  const departmentId = dept === "all" ? undefined : Number(dept);
  const { data: deptRes } = useDepartments();
  const departments = useMemo(() => deptRes?.data ?? [], [deptRes]);

  const analytics = useAnalyticsReport(period, departmentId);
  const attention = useAttentionReport(departmentId);
  const exportReport = useExportAnalyticsReport();
  const report = analytics.data?.data;

  // Clock for relative times, updated each minute
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // New applicants are already in the "needs you" row, so the strip leaves them out
  const kpis = useMemo(
    () => (report ? buildKpis(report.summary).filter((kpi) => kpi.key !== "applications") : []),
    [report],
  );

  const { label: periodLabel, days } = periodOf(period);
  const departmentName = departments.find((d) => String(d.id) === dept)?.name ?? "All departments";

  const handleExport = async () => {
    try {
      const result = await exportReport.mutateAsync({ period, departmentId, format: exportFormat });
      const { content, mimeType, fileName } = result.data;
      const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
      Object.assign(document.createElement("a"), { href: url, download: fileName }).click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export the report");
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <OverviewHeader
          firstName={me?.data?.firstName}
          period={period}
          onPeriodChange={setPeriod}
          departmentId={dept}
          onDepartmentChange={setDept}
          departments={departments}
          canExport
          onExport={() => setExportOpen(true)}
        />

        {analytics.isError && !report ? (
          <div role="alert" className={`${cardCls} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              The overview could not be loaded.
            </p>
            <Button variant="cancel" className="h-8 px-3 text-sm" onClick={() => analytics.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <AttentionPanel
              report={attention.data?.data}
              isLoading={attention.isPending}
              isError={attention.isError}
              onRetry={() => attention.refetch()}
              now={now}
            />

            <KpiCards kpis={kpis} comparedWith={`the previous ${days} days`} isLoading={analytics.isPending} />

            {/* Dim the charts while loading */}
            <div
              aria-busy={analytics.isPlaceholderData}
              className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${analytics.isPlaceholderData ? "opacity-60" : ""}`}
            >
              <Card
                title="Applications and hires"
                subtitle={`Applications received and offers accepted, ${periodLabel.toLowerCase()}`}
              >
                <VolumeChart data={report?.candidateVolume ?? []} />
              </Card>
              <Card
                title="Movement between stages"
                subtitle={`Candidates who entered each stage, compared with the previous ${days} days`}
              >
                <PipelineChart data={report?.pipelineReport ?? []} />
              </Card>
            </div>
          </>
        )}
      </div>

      <ExportDialog
        open={exportOpen}
        format={exportFormat}
        onFormatChange={setExportFormat}
        scope={`${periodLabel}, ${departmentName}`}
        isPending={exportReport.isPending}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
      />
    </div>
  );
}
