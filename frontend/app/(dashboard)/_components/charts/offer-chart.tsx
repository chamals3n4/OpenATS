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
  sent: { label: "Sent", color: "var(--theme-color)" },
  accepted: { label: "Accepted", color: "var(--color-green-600)" },
} satisfies ChartConfig;

export function OfferChart({
  data,
}: {
  data: { month: string; sent: number; accepted: number }[];
}) {
  if (!data.length || data.every((d) => d.sent === 0 && d.accepted === 0)) {
    return <ChartEmpty message="No offers have been sent in the last 5 months." />;
  }
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data} barGap={3} barCategoryGap="35%">
        <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-neutral-700" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sent" fill="var(--color-sent)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="accepted" fill="var(--color-accepted)" radius={[3, 3, 0, 0]} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
