import Image from "next/image";
import { cn } from "@/lib/utils";

const TINTS = [
  "bg-[#F4EBDD] text-[#7A3E12]",
  "bg-[#E8F0E3] text-[#2F5D2B]",
  "bg-[#FBE3D3] text-[#9A3412]",
  "bg-[#E6EEF5] text-[#1E3A5F]",
  "bg-[#F6EAF0] text-[#7C2D5B]",
  "bg-[#FFF4CC] text-[#7A5A00]",
];

export function ProductThumb({
  src,
  name,
  className,
  size = 40,
}: {
  src?: string | null;
  name: string;
  className?: string;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size * 2}
        height={size * 2}
        className={cn(
          "shrink-0 rounded-md border bg-white object-cover",
          className,
        )}
        style={{ width: size, height: size }}
        unoptimized={src.startsWith("data:")}
      />
    );
  }
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  // Letters only, so "Onion - 5 kg" reads "ON" rather than "O5".
  const words = name
    .replace(/[^\p{L} ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(kg|g|ml|l|pcs?|pack)$/i.test(w));
  const initials = (
    words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "").slice(0, 2)
  ).toUpperCase();
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-md font-semibold",
        TINTS[hash % TINTS.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.32) }}
    >
      {initials || "•"}
    </div>
  );
}
