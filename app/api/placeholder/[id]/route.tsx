import { ImageResponse } from "next/og";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PALETTES = [
  ["#F4EBDD", "#7A3E12"], ["#E8F0E3", "#2F5D2B"], ["#FBE3D3", "#9A3412"],
  ["#E6EEF5", "#1E3A5F"], ["#F6EAF0", "#7C2D5B"], ["#FFF4CC", "#7A5A00"],
];

// A typographic tile for products (and stores) that don't have a photo yet, so channels
// that require an image (ONDC) always get one. Public: catalog content is public anyway.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let title = "Onboarder";
  let subtitle = "";
  if (id.startsWith("store-")) {
    const store = await db.store.findUnique({ where: { id: id.slice(6) }, select: { name: true, city: true } });
    title = store?.name ?? title;
    subtitle = store?.city ?? "";
  } else {
    const p = await db.product.findUnique({ where: { id }, select: { name: true, variantLabel: true, brand: true } });
    if (p) {
      title = p.name.replace(/\s*[-–]\s*[\d.]+\s*\w+$/, "");
      subtitle = p.variantLabel ?? p.brand ?? "";
    }
  }
  const hash = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [bg, ink] = PALETTES[hash % PALETTES.length];
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: bg, color: ink, padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: title.length > 24 ? 64 : 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
      {subtitle ? <div style={{ marginTop: 28, fontSize: 40, opacity: 0.75 }}>{subtitle}</div> : null}
    </div>,
    { width: 800, height: 800, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}
