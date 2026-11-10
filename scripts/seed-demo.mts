// Seeds a realistic demo kirana for local development.
//   node --env-file=.env.local scripts/seed-demo.mts
// Login: demo@onboarder.local / demo1234   (re-running resets the demo account)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const EMAIL = "demo@onboarder.local";

await db.user.deleteMany({ where: { email: EMAIL } });
const user = await db.user.create({
  data: {
    email: EMAIL,
    name: "Ramesh Sharma",
    password: await bcrypt.hash("demo1234", 10),
    emailVerified: new Date(),
    subscriptions: { create: {} },
  },
});

await db.store.create({
  data: {
    userId: user.id,
    name: "Sharma General Store",
    slug: "sharma-general-store",
    tagline: "Your neighbourhood kirana in Jayanagar since 1987",
    phone: "9886098860",
    whatsapp: "9886098860",
    email: "sharma.store@example.com",
    addressLine: "No. 42, 11th Main Road",
    locality: "Jayanagar 4th Block",
    city: "Bengaluru",
    state: "KA",
    pincode: "560011",
    stdCode: "std:080",
    latitude: 12.9255,
    longitude: 77.5937,
    deliveryFee: 20,
    serviceRadiusKm: 3,
    timeToShipMinutes: 30,
    // GSTIN and FSSAI intentionally missing so ONDC readiness has work to show.
  },
});

type P = Parameters<typeof db.product.create>[0]["data"];
const packaged: Omit<P, "userId">[] = [
  {
    name: "Aashirvaad Whole Wheat Atta 5 kg",
    brand: "Aashirvaad",
    barcode: "8901725121203",
    price: 289,
    mrp: 310,
    stock: 12,
    unit: "kg",
    unitValue: 5,
    ondcCategory: "Atta, Flours and Sooji",
    vegType: "veg",
    manufacturer: "ITC Limited",
  },
  {
    name: "Tata Salt Iodised 1 kg",
    brand: "Tata",
    barcode: "8904043901015",
    price: 28,
    mrp: 28,
    stock: 40,
    unit: "kg",
    unitValue: 1,
    ondcCategory: "Salt, Sugar and Jaggery",
    vegType: "veg",
    manufacturer: "Tata Consumer Products",
  },
  {
    name: "Parle-G Gold Biscuits 1 kg",
    brand: "Parle",
    barcode: "8901719104046",
    price: 140,
    mrp: 150,
    stock: 3,
    unit: "kg",
    unitValue: 1,
    ondcCategory: "Chocolates and Biscuits",
    vegType: "veg",
    manufacturer: "Parle Products",
  },
  {
    name: "Yippee Magic Masala Noodles 280 g",
    brand: "Sunfeast",
    barcode: "8901725181222",
    price: 56,
    mrp: 60,
    stock: 24,
    unit: "g",
    unitValue: 280,
    ondcCategory: "Pasta, Soup and Noodles",
    vegType: "veg",
  },
  {
    name: "Fortune Sunflower Oil 1 L",
    brand: "Fortune",
    price: 165,
    mrp: 180,
    stock: 2,
    unit: "l",
    unitValue: 1,
    ondcCategory: "Oil & Ghee",
    vegType: "veg",
  },
  {
    name: "Surf Excel Easy Wash 1 kg",
    brand: "Surf Excel",
    price: 140,
    mrp: 150,
    stock: 15,
    unit: "kg",
    unitValue: 1,
    ondcCategory: "Cleaning & Household",
  },
  {
    name: "Red Label Tea 500 g",
    brand: "Brooke Bond",
    price: 265,
    mrp: 280,
    stock: 9,
    unit: "g",
    unitValue: 500,
    ondcCategory: "Tea and Coffee",
    vegType: "veg",
  },
  {
    name: "AMUL BUTTER",
    description: "",
    price: 58,
    mrp: 60,
    stock: 0,
    ondcCategory: "Dairy and Cheese",
  },
  { name: "Colgate toothpaste", description: "", price: null, stock: 20 },
  {
    name: "Maggi 2-Minute Noodles 70 g",
    brand: "Maggi",
    price: 14,
    mrp: 14,
    stock: 60,
    unit: "g",
    unitValue: 70,
    ondcCategory: "Pasta, Soup and Noodles",
    vegType: "veg",
  },
];
const looseGroups = [
  { key: "toor-dal", name: "Toor Dal", cat: "Dals and Pulses", rate: 160 },
  {
    key: "sona-masoori",
    name: "Sona Masoori Rice",
    cat: "Rice and Rice Products",
    rate: 62,
  },
  { key: "sugar", name: "Sugar", cat: "Salt, Sugar and Jaggery", rate: 46 },
  { key: "onion", name: "Onion", cat: "Fruits and Vegetables", rate: 40 },
];

const created: { id: string; name: string; price: number }[] = [];
for (const p of packaged) {
  const row = await db.product.create({
    data: {
      ...p,
      userId: user.id,
      type: "PACKAGED",
      description:
        p.description ??
        `${p.name}. Genuine product, stored in a cool dry place at our store.`,
      category: p.ondcCategory ?? "General",
      status: p.price ? "ACTIVE" : "DRAFT",
      createdAt: new Date(Date.now() - 40 * 864e5),
    },
  });
  if (row.price)
    created.push({ id: row.id, name: row.name, price: Number(row.price) });
}
for (const g of looseGroups) {
  for (const [value, unit, factor] of [
    [500, "g", 0.5],
    [1, "kg", 1],
    [5, "kg", 5],
  ] as const) {
    const label = `${value} ${unit}`;
    const row = await db.product.create({
      data: {
        userId: user.id,
        type: "LOOSE",
        name: `${g.name} - ${label}`,
        description: `${g.name}, weighed and packed fresh at our store. Pack size: ${label}.`,
        category: g.cat,
        ondcCategory: g.cat,
        vegType: "veg",
        unit,
        unitValue: value,
        price: Math.round(g.rate * factor),
        mrp: Math.round(g.rate * factor),
        variantGroup: g.key,
        variantLabel: label,
        createdAt: new Date(Date.now() - 35 * 864e5),
      },
    });
    created.push({ id: row.id, name: row.name, price: Number(row.price) });
  }
}

// 30 days of orders, evening-heavy, across channels.
const sources = ["MANUAL", "MANUAL", "ONDC", "ONDC", "SHOPIFY"] as const;
const customers = [
  ["Anita K", "9900011122"],
  ["Rahul M", "9900033344"],
  ["Priya S", "9900055566"],
  ["Walk-in", null],
] as const;
let seq = 1000;
for (let day = 29; day >= 0; day--) {
  const n = 2 + Math.floor(Math.random() * 5) + (day < 10 ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const hour = [9, 11, 18, 19, 19, 20, 21][Math.floor(Math.random() * 7)];
    const at = new Date(Date.now() - day * 864e5);
    at.setUTCHours(hour - 5, 30 * Math.floor(Math.random() * 2), 0, 0);
    if (at > new Date()) continue;
    const picks = [...created]
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 4));
    const items = picks.map((p) => ({
      productId: p.id,
      name: p.name,
      quantity: 1 + Math.floor(Math.random() * 3),
      price: p.price,
    }));
    const subtotal = items.reduce((s, x) => s + x.price * x.quantity, 0);
    const source = sources[Math.floor(Math.random() * sources.length)];
    const [customerName, customerPhone] =
      customers[Math.floor(Math.random() * customers.length)];
    const fresh = day === 0 && i < 2;
    await db.order.create({
      data: {
        userId: user.id,
        orderNumber: `OB-DEMO${seq++}`,
        source,
        externalId: source === "MANUAL" ? null : `demo-${seq}`,
        status: fresh
          ? i === 0
            ? "ACCEPTED"
            : "PACKED"
          : Math.random() < 0.05
            ? "CANCELLED"
            : "DELIVERED",
        paymentMethod: source === "MANUAL" ? "UPI" : "PREPAID",
        paymentStatus: "PAID",
        customerName,
        customerPhone,
        customerAddress:
          source === "MANUAL" ? null : "Jayanagar 5th Block, Bengaluru 560041",
        subtotal,
        deliveryFee: source === "MANUAL" ? 0 : 20,
        total: subtotal + (source === "MANUAL" ? 0 : 20),
        createdAt: at,
        channelData: source === "ONDC" ? { buyerApp: "paytm.com" } : undefined,
        items: { create: items },
      },
    });
  }
}

console.log(
  `Seeded ${created.length + 2} products and ${seq - 1000} orders for ${EMAIL} (password demo1234)`,
);
await db.$disconnect();
