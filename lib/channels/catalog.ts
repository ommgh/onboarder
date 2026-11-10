// Channel metadata shared by server and client. No secrets or server imports here.

export type ChannelId = "ONDC" | "SHOPIFY" | "AMAZON" | "FLIPKART";

export interface ChannelInfo {
  id: ChannelId;
  name: string;
  logo: string;
  tagline: string;
  /** how products reach the channel */
  mode: "network" | "push" | "offer" | "sheet";
  modeLabel: string;
  detail: string;
}

export const CHANNELS: ChannelInfo[] = [
  {
    id: "ONDC",
    name: "ONDC",
    logo: "/logos/ondc.svg",
    tagline: "India's open network: Paytm, Magicpin, PhonePe Pincode and more",
    mode: "network",
    modeLabel: "Live on the network",
    detail:
      "Your catalog is served to every ONDC buyer app searching in your city. Orders arrive here automatically. No commission to Onboarder.",
  },
  {
    id: "SHOPIFY",
    name: "Shopify",
    logo: "/logos/shopify.svg",
    tagline: "Your own branded online store",
    mode: "push",
    modeLabel: "Two-way sync",
    detail:
      "Products, prices, pack sizes and photos are created in your Shopify store with one click, and re-sync when you edit them here.",
  },
  {
    id: "AMAZON",
    name: "Amazon.in",
    logo: "/logos/amazon.svg",
    tagline: "India's largest marketplace",
    mode: "offer",
    modeLabel: "Match & sell",
    detail:
      "Products with a barcode are matched to Amazon's existing catalog and listed under your seller account at your price. Brand-new products still need to be created in Seller Central.",
  },
  {
    id: "FLIPKART",
    name: "Flipkart",
    logo: "/logos/flipkart.svg",
    tagline: "Reach Flipkart's shoppers",
    mode: "sheet",
    modeLabel: "Listing sheet",
    detail:
      "Flipkart only accepts new listings through Seller Hub. We prepare a filled bulk-listing sheet from your catalog that you upload in Seller Hub → Listings → Add in bulk.",
  },
];

export const channelById = (id: string) => CHANNELS.find((c) => c.id === id);
