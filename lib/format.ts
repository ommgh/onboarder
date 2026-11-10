const inrFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const inrWholeFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const numFmt = new Intl.NumberFormat("en-IN");

/** ₹1,234 for whole rupees, ₹1,234.50 when there are paise. */
export const inr = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "—"
    : Number.isInteger(Math.round(n * 100) / 100)
      ? inrWholeFmt.format(n)
      : inrFmt.format(n);

/** Short Indian-style labels for chart axes: ₹950, ₹8k, ₹1.2L, ₹3.4Cr. */
export function inrCompact(n: number): string {
  const a = Math.abs(n);
  const trim = (v: number) => String(Number(v.toFixed(1)));
  if (a >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (a >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (a >= 1e3) return `₹${trim(n / 1e3)}k`;
  return `₹${Math.round(n)}`;
}
export const num = (n: number) => numFmt.format(n);

export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const pluralize = (n: number, one: string, many = `${one}s`) =>
  `${num(n)} ${n === 1 ? one : many}`;
