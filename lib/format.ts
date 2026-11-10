const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inrCompactFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat("en-IN");

export const inr = (n: number | null | undefined) => (n === null || n === undefined ? "—" : inrFmt.format(n));
export const inrCompact = (n: number) => (Math.abs(n) >= 100000 ? inrCompactFmt.format(n) : inrFmt.format(Math.round(n)));
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

export const pluralize = (n: number, one: string, many = `${one}s`) => `${num(n)} ${n === 1 ? one : many}`;
