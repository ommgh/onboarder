// ONDC retail domains and their category ids (Retail v1.2 B2C taxonomy).
// category_id values must match the network enum exactly, so they are stored verbatim.

export interface OndcDomain {
  code: string;
  label: string;
  categories: string[];
}

export const ONDC_DOMAINS: OndcDomain[] = [
  {
    code: "ONDC:RET10",
    label: "Grocery",
    categories: [
      "Fruits and Vegetables",
      "Atta, Flours and Sooji",
      "Rice and Rice Products",
      "Dals and Pulses",
      "Salt, Sugar and Jaggery",
      "Masala & Seasoning",
      "Oil & Ghee",
      "Foodgrains",
      "Dairy and Cheese",
      "Bakery, Cakes & Dairy",
      "Eggs, Meat & Fish",
      "Snacks, Dry Fruits, Nuts",
      "Snacks and Namkeen",
      "Chocolates and Biscuits",
      "Tea and Coffee",
      "Energy and Soft Drinks",
      "Fruit Juices and Fruity Drinks",
      "Water",
      "Pasta, Soup and Noodles",
      "Cereals and Breakfast",
      "Sauces, Spreads and Dips",
      "Cooking and Baking Needs",
      "Tinned and Processed Food",
      "Ready to Cook and Eat",
      "Pickles and Chutney",
      "Indian Sweets",
      "Frozen Vegetables",
      "Frozen Snacks",
      "Cleaning & Household",
      "Pet Care",
      "Stationery",
    ],
  },
  {
    code: "ONDC:RET12",
    label: "Fashion",
    categories: [
      "Shirts",
      "T Shirts",
      "Tops",
      "Kurtas & Kurta Sets",
      "Kurtis, Tunics",
      "Sarees",
      "Dupattas",
      "Lehenga Cholis",
      "Dresses",
      "Jeans",
      "Trousers",
      "Ethnic Wear",
      "Kids Clothing",
      "Footwear",
      "Bags",
      "Jewellery",
      "Accessories",
    ],
  },
  {
    code: "ONDC:RET13",
    label: "Beauty & Personal Care",
    categories: [
      "Bath & Body",
      "Hair Care",
      "Skin Care",
      "Oral Care",
      "Fragrance",
      "Make Up",
      "Men's Grooming",
      "Feminine Care",
      "Baby Care",
    ],
  },
  {
    code: "ONDC:RET16",
    label: "Home & Kitchen",
    categories: [
      "Home Decor",
      "Home Furnishings",
      "Cookware and Dining",
      "Storage and Organisation",
      "Furniture",
      "Garden and Outdoor Products",
      "Handicrafts",
      "Art & Paintings",
    ],
  },
  {
    code: "ONDC:RET18",
    label: "Health & Wellness",
    categories: [
      "Ayurveda",
      "Nutrition and Supplements",
      "Health Devices",
      "Personal Protective Equipment",
    ],
  },
  {
    code: "ONDC:RET14",
    label: "Electronics",
    categories: [
      "Mobile Phone",
      "Mobile Accessories",
      "Headphones",
      "Chargers",
      "Computer Accessories",
    ],
  },
];

export function domainForCategory(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  return (
    ONDC_DOMAINS.find((d) => d.categories.includes(category))?.code ?? null
  );
}

export const FOOD_CATEGORIES = new Set(
  ONDC_DOMAINS[0].categories.filter(
    (c) => !["Cleaning & Household", "Pet Care", "Stationery"].includes(c),
  ),
);

/** Maps Onboarder units onto ONDC unitized measure units. */
export function ondcUnit(unit: string | null | undefined): string {
  switch ((unit ?? "").toLowerCase()) {
    case "kg":
      return "kilogram";
    case "g":
      return "gram";
    case "l":
      return "litre";
    case "ml":
      return "millilitre";
    case "dozen":
      return "dozen";
    default:
      return "unit";
  }
}

// Keyword hints for mapping free text (Open Food Facts categories, product names, CSV
// groups) onto an ONDC grocery category. First match wins, so order is specific -> broad.
const HINTS: [RegExp, string][] = [
  [/noodle|pasta|soup|maggi|yippee/i, "Pasta, Soup and Noodles"],
  [/biscuit|cookie|chocolate|cadbury|wafer/i, "Chocolates and Biscuits"],
  [/namkeen|bhujia|chips|crisps|snack|kurkure/i, "Snacks and Namkeen"],
  [
    /almond|cashew|raisin|walnut|pista|dry ?fruit|nuts?\b|makhana|dates/i,
    "Snacks, Dry Fruits, Nuts",
  ],
  [/\batta\b|flour|maida|besan|sooji|rava|suji/i, "Atta, Flours and Sooji"],
  [/\brice\b|basmati|poha/i, "Rice and Rice Products"],
  [
    /\bdal\b|pulse|lentil|rajma|chana|moong|toor|urad|masoor/i,
    "Dals and Pulses",
  ],
  [/sugar|salt|jaggery|gud\b/i, "Salt, Sugar and Jaggery"],
  [
    /masala|spice|turmeric|haldi|chilli|jeera|cumin|coriander|pepper|seasoning/i,
    "Masala & Seasoning",
  ],
  [/\boil\b|ghee|vanaspati/i, "Oil & Ghee"],
  [/\btea\b|coffee|chai/i, "Tea and Coffee"],
  [/juice|fruity|frooti|maaza/i, "Fruit Juices and Fruity Drinks"],
  [/soft drink|cola|soda|energy drink|beverage/i, "Energy and Soft Drinks"],
  [/\bwater\b/i, "Water"],
  [/milk|paneer|cheese|curd|butter|yogh?urt|dairy/i, "Dairy and Cheese"],
  [/bread|cake|bakery|rusk|bun/i, "Bakery, Cakes & Dairy"],
  [/egg|chicken|mutton|fish|meat/i, "Eggs, Meat & Fish"],
  [/sauce|ketchup|jam|spread|mayonnaise|dip/i, "Sauces, Spreads and Dips"],
  [/pickle|achar|chutney/i, "Pickles and Chutney"],
  [/cereal|oats|muesli|cornflakes|breakfast/i, "Cereals and Breakfast"],
  [/ready to (eat|cook)|instant/i, "Ready to Cook and Eat"],
  [/sweet|mithai|laddoo|halwa/i, "Indian Sweets"],
  [
    /detergent|soap|cleaner|dishwash|floor|toilet|phenyl|household/i,
    "Cleaning & Household",
  ],
  [/shampoo|hair/i, "Hair Care"],
  [/toothpaste|toothbrush|oral/i, "Oral Care"],
  [/cream|lotion|face ?wash|skin/i, "Skin Care"],
  [/pet|dog|cat food/i, "Pet Care"],
  [/pen|pencil|notebook|stationery/i, "Stationery"],
  [/vegetable|fruit|onion|potato|tomato/i, "Fruits and Vegetables"],
];

export function guessOndcCategory(
  ...texts: (string | null | undefined)[]
): string | null {
  const text = texts.filter(Boolean).join(" ");
  if (!text) return null;
  return HINTS.find(([re]) => re.test(text))?.[1] ?? null;
}

export const ALL_ONDC_CATEGORIES = ONDC_DOMAINS.flatMap((d) =>
  d.categories.map((c) => ({ domain: d.label, category: c })),
);
