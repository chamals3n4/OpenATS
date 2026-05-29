"use client";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";

export function SourceChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  if (!data.length) return <p className="text-sm text-slate-400 p-8 text-center">No source data yet.</p>;
  const config = Object.fromEntries(data.map((s) => [s.name, { label: s.name, color: s.color }])) as ChartConfig;
  return (
    <>
      <ChartContainer config={config} className="h-44 w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={68} strokeWidth={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1">
        {data.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-500 dark:text-neutral-400">{s.name}</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-neutral-200 ml-auto">{s.value}%</span>
          </div>
        ))}
      </div>
    </>
  );
}
