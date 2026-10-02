"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartEmpty } from "./chart-empty";

const config = {
  current: { label: "This period", color: "var(--theme-color)" },
  previous: { label: "Previous period", color: "var(--color-slate-300)" },
} satisfies ChartConfig;

/** Room for the longest stage name at 12px, so no two labels ever overlap. */
const labelWidth = (names: string[]) =>
  Math.min(190, Math.max(72, Math.max(...names.map((n) => n.length)) * 7 + 12));

const ROW_HEIGHT = 46;

export function PipelineChart({
  data,
}: {
  data: { stage: string; current: number; previous: number }[];
}) {
  if (!data.length || data.every((d) => d.current === 0 && d.previous === 0)) {
    return <ChartEmpty message="No candidates have moved between stages in this period." />;
  }
  // One row per stage, so the chart grows with the pipeline instead of squeezing the names.
  const height = Math.max(224, data.length * ROW_HEIGHT + 56);
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" barGap={2} barCategoryGap="24%">
        <CartesianGrid horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-neutral-700" />
        <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="stage"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={labelWidth(data.map((d) => d.stage))}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="current" fill="var(--color-current)" radius={[0, 3, 3, 0]} />
        <Bar dataKey="previous" fill="var(--color-previous)" radius={[0, 3, 3, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
