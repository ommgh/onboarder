"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { inr, inrCompact } from "@/lib/format";

const revenueConfig = { revenue: { label: "Sales", color: "var(--chart-1)" } } satisfies ChartConfig;

export function SalesChart({ data, height = 220 }: { data: { date: string; revenue: number; orders: number }[]; height?: number }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));
  return (
    <ChartContainer config={revenueConfig} className="w-full" style={{ height }}>
      <BarChart data={rows} margin={{ left: 4, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={52} fontSize={11} tickFormatter={(v: number) => inrCompact(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              labelKey="label"
              formatter={(value, _n, item) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{item.payload.orders} orders</span>
                  <span className="font-medium tabular">{inr(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}

const hourConfig = { orders: { label: "Orders", color: "var(--chart-2)" } } satisfies ChartConfig;

export function HourChart({ data }: { data: { hour: number; orders: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: `${d.hour % 12 || 12}${d.hour < 12 ? "am" : "pm"}` }));
  return (
    <ChartContainer config={hourConfig} className="h-[180px] w-full">
      <BarChart data={rows} margin={{ left: 0, right: 0, top: 8 }}>
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} fontSize={10} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent labelKey="label" />} />
        <Bar dataKey="orders" fill="var(--color-orders)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
