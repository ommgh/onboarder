"use client";

import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { inr } from "@/lib/format";

/** Daily sales as a soft area, with orders alongside in the tooltip. */
export function SalesChart({
  data,
  height = 220,
}: {
  data: { date: string; revenue: number; orders: number }[];
  height?: number;
}) {
  const rows = data.map((d) => ({
    date: new Date(`${d.date}T00:00:00`),
    revenue: d.revenue,
    orders: d.orders,
  }));
  return (
    <AreaChart
      data={rows}
      aspectRatio="auto"
      className="w-full"
      style={{ height }}
      margin={{ top: 16, right: 12, bottom: 28, left: 12 }}
    >
      <Grid horizontal numTicksRows={4} />
      <Area
        dataKey="revenue"
        fill="var(--chart-1)"
        fillOpacity={0.28}
        strokeWidth={2}
        fadeEdges={{ left: 0, right: 8 }}
      />
      <XAxis numTicks={{ base: 3, sm: 5, lg: 6 }} />
      <ChartTooltip
        rows={(p) => [
          {
            color: "var(--chart-1)",
            label: "Sales",
            value: inr(Number(p.revenue ?? 0)),
          },
          {
            color: "var(--chart-2)",
            label: "Orders",
            value: Number(p.orders ?? 0),
          },
        ]}
      />
    </AreaChart>
  );
}

/** Orders by hour of day. */
export function HourChart({
  data,
}: {
  data: { hour: number; orders: number }[];
}) {
  const rows = data.map((d) => ({
    label: `${d.hour % 12 || 12}${d.hour < 12 ? "am" : "pm"}`,
    orders: d.orders,
  }));
  return (
    <BarChart
      data={rows}
      xDataKey="label"
      aspectRatio="auto"
      className="h-[180px] w-full"
      margin={{ top: 12, right: 4, bottom: 24, left: 4 }}
      barGap={0.3}
    >
      <Bar dataKey="orders" fill="var(--chart-1)" lineCap={3} />
      <BarXAxis maxLabels={8} />
      <ChartTooltip
        showDatePill={false}
        rows={(p) => [
          {
            color: "var(--chart-1)",
            label: `Orders at ${String(p.label)}`,
            value: Number(p.orders ?? 0),
          },
        ]}
      />
    </BarChart>
  );
}
