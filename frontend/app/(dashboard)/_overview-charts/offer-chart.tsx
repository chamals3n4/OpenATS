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

const offerConfig = {
  sent: { label: "Sent", color: "var(--theme-color)" },
  accepted: { label: "Accepted", color: "#22c55e" },
} satisfies ChartConfig;

export function OfferChart({
  data,
}: {
  data: { month: string; sent: number; accepted: number }[];
}) {
  if (!data.length)
    return (
      <p className="text-sm text-slate-400 p-8 text-center">
        No offer data yet.
      </p>
    );
  return (
    <ChartContainer config={offerConfig} className="h-52 w-full">
      <BarChart data={data} barGap={3} barCategoryGap="35%">
        <CartesianGrid
          vertical={false}
          stroke="currentColor"
          className="text-slate-100 dark:text-neutral-800"
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={26}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[3, 3, 0, 0]} />
        <Bar
          dataKey="accepted"
          fill="var(--color-accepted)"
          radius={[3, 3, 0, 0]}
        />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
