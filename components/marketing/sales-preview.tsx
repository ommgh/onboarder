"use client";

import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";

// A fortnight of sample sales for a single kirana: steady counter sales plus the
// online orders that started after going live on ONDC (day 6).
const DATA = [
  [2100, 0],
  [2380, 0],
  [1960, 0],
  [2440, 0],
  [2610, 0],
  [2290, 420],
  [2520, 760],
  [2700, 980],
  [2480, 1240],
  [2860, 1510],
  [3020, 1380],
  [2750, 1820],
  [3140, 2060],
  [3310, 2390],
].map(([counter, online], i) => ({
  date: new Date(2026, 9, 1 + i),
  counter,
  online,
}));

const inr = (v: unknown) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

export function SalesPreview() {
  return (
    <AreaChart
      data={DATA}
      aspectRatio="auto"
      className="h-56 w-full"
      margin={{ top: 16, right: 8, bottom: 28, left: 8 }}
    >
      <Grid horizontal numTicksRows={4} />
      <Area
        dataKey="counter"
        fill="var(--chart-2)"
        fillOpacity={0.35}
        strokeWidth={1.5}
      />
      <Area
        dataKey="online"
        fill="var(--chart-1)"
        fillOpacity={0.3}
        strokeWidth={2}
      />
      <XAxis numTicks={4} />
      <ChartTooltip
        rows={(p) => [
          { color: "var(--chart-1)", label: "Online", value: inr(p.online) },
          { color: "var(--chart-2)", label: "Counter", value: inr(p.counter) },
        ]}
      />
    </AreaChart>
  );
}
