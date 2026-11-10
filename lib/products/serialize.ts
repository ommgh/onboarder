import type { ChannelListing, Product } from "@prisma/client";

export type ProductDTO = Omit<
  Product,
  "price" | "mrp" | "unitValue" | "gstRate" | "createdAt" | "updatedAt"
> & {
  price: number | null;
  mrp: number | null;
  unitValue: number | null;
  gstRate: number | null;
  createdAt: string;
  updatedAt: string;
  listings?: Pick<
    ChannelListing,
    "provider" | "status" | "message" | "externalUrl"
  >[];
};

const num = (v: { toString(): string } | null) =>
  v === null ? null : Number(v);

export function toProductDTO(
  p: Product & { listings?: ChannelListing[] },
): ProductDTO {
  return {
    ...p,
    price: num(p.price),
    mrp: num(p.mrp),
    unitValue: num(p.unitValue),
    gstRate: num(p.gstRate),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    listings: p.listings?.map(({ provider, status, message, externalUrl }) => ({
      provider,
      status,
      message,
      externalUrl,
    })),
  };
}
