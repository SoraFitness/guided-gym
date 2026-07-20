const BRAND_DOMAINS: Record<string, string> = {
  "McDonald's": "mcdonalds.com",
  Starbucks: "starbucks.com",
  Subway: "subway.com",
  Chipotle: "chipotle.com",
  "Tim Hortons": "timhortons.com",
  "Wendy's": "wendys.com",
  "A&W": "awrestaurants.com",
  Popeyes: "popeyes.com",
  PRIME: "drinkprime.com",
  Fairlife: "fairlife.com",
  Quest: "questnutrition.com",
  "Premier Protein": "premierprotein.com",
  "Muscle Milk": "musclemilk.com",
  Celsius: "celsius.com",
  Gatorade: "gatorade.com",
  "Optimum Nutrition": "optimumnutrition.com",
  Kirkland: "costco.com",
  "Great Value": "walmart.com",
  "Nature Valley": "naturevalley.com",
  Quaker: "quakeroats.com",
  Cheerios: "cheerios.com",
  Oreo: "oreo.com",
  "Lay's": "lays.com",
};

const PHOTOS = {
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=240&h=240&q=80",
  sandwich:
    "https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=240&h=240&q=80",
  coffee:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=240&h=240&q=80",
  bowl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=240&h=240&q=80",
  chicken:
    "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=240&h=240&q=80",
  granola:
    "https://images.unsplash.com/photo-1517093157656-b9eccef91cb1?auto=format&fit=crop&w=240&h=240&q=80",
  eggs: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=240&h=240&q=80",
  fries:
    "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=240&h=240&q=80",
  cereal:
    "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=240&h=240&q=80",
} as const;

const PRODUCT_PHOTOS: Record<string, string> = {
  "preset:mcd-mcmuffin-egg":
    "https://s7d1.scene7.com/is/image/mcdonalds/DC_202004_0046_EggMcMuffin_832x472:1-3-product-tile-desktop?wid=829&hei=515&dpr=off",
  "preset:mcd-fries-med":
    "https://s7d1.scene7.com/is/image/mcdonalds/DC_202002_8932_MediumFries_832x472:1-3-product-tile-desktop?wid=829&hei=515&dpr=off",
};

export interface FoodImageInput {
  id?: string;
  name?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  tags?: string[];
}

export function getBrandLogoUrl(brand?: string): string | undefined {
  if (!brand) return undefined;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedBrand = normalize(brand);
  const matchedBrand = Object.keys(BRAND_DOMAINS).find((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return (
      normalizedCandidate === normalizedBrand ||
      (normalizedCandidate.length > 4 && normalizedBrand.includes(normalizedCandidate))
    );
  });
  const domain = matchedBrand ? BRAND_DOMAINS[matchedBrand] : undefined;
  return domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : undefined;
}

export function getFoodImageUrl(food: FoodImageInput): string | undefined {
  if (food.imageUrl) return food.imageUrl;
  if (food.id && PRODUCT_PHOTOS[food.id]) return PRODUCT_PHOTOS[food.id];

  const text =
    `${food.id ?? ""} ${food.brand ?? ""} ${food.name ?? ""} ${(food.tags ?? []).join(" ")}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((needle) => text.includes(needle));

  if (has("egg mcmuffin", "scrambled egg", " eggs", "egg ")) return PHOTOS.eggs;
  if (has("fries", "hash brown", "hashbrown", "onion ring", "potato")) return PHOTOS.fries;
  if (has("coffee", "latte", "macchiato", "cold brew", "iced capp", "pink drink"))
    return PHOTOS.coffee;
  if (has("subway", "sandwich", "bagel", "toast", "bread", "mcmuffin")) return PHOTOS.sandwich;
  if (has("chipotle", "bowl", "burrito", "rice", "broccoli", "salad")) return PHOTOS.bowl;
  if (has("chicken", "nugget", "tender", "salmon", "tuna", "fish")) return PHOTOS.chicken;
  if (has("burger", "big mac", "quarter pounder", "baconator", "dave's single"))
    return PHOTOS.burger;
  if (has("oat", "granola", "nature valley", "protein bar", "quest", "oreo", "cookie", "chips"))
    return PHOTOS.granola;
  if (has("cereal", "cheerios", "quaker")) return PHOTOS.cereal;
  if (has("banana", "apple", "avocado", "almond", "yogurt")) return PHOTOS.bowl;
  if (has("shake", "milk", "celsius", "gatorade", "prime", "drink")) return PHOTOS.coffee;

  if (food.category === "restaurant") return PHOTOS.burger;
  if (food.category === "protein") return PHOTOS.chicken;
  if (food.category === "grocery") return PHOTOS.granola;
  return PHOTOS.bowl;
}
