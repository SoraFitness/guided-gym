// Curated branded food preset database with real nutrition values
// Sources: official brand nutrition pages (McDonald's, Starbucks, etc.)
// All values verified against brand-published nutrition data as of 2025.

export type BrandCategory = "restaurant" | "protein" | "grocery";

export interface BrandedFood {
  id: string;            // "preset:mcdonalds-big-mac"
  brand: string;
  name: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  category: BrandCategory;
  emoji?: string;
}

export interface PopularBrand {
  name: string;
  emoji: string;
  category: BrandCategory;
}

export const popularBrands: PopularBrand[] = [
  { name: "McDonald's",        emoji: "🍟", category: "restaurant" },
  { name: "Starbucks",         emoji: "☕", category: "restaurant" },
  { name: "Subway",            emoji: "🥪", category: "restaurant" },
  { name: "Chipotle",          emoji: "🌯", category: "restaurant" },
  { name: "Tim Hortons",       emoji: "🍩", category: "restaurant" },
  { name: "Wendy's",           emoji: "🍔", category: "restaurant" },
  { name: "A&W",               emoji: "🥤", category: "restaurant" },
  { name: "Popeyes",           emoji: "🍗", category: "restaurant" },
  { name: "PRIME",             emoji: "💪", category: "protein" },
  { name: "Fairlife",          emoji: "🥛", category: "protein" },
  { name: "Quest",             emoji: "🍫", category: "protein" },
  { name: "Premier Protein",   emoji: "🥤", category: "protein" },
  { name: "Muscle Milk",       emoji: "💪", category: "protein" },
  { name: "Celsius",           emoji: "⚡", category: "protein" },
  { name: "Gatorade",          emoji: "🥤", category: "protein" },
  { name: "Optimum Nutrition", emoji: "💪", category: "protein" },
  { name: "Kirkland",          emoji: "🛒", category: "grocery" },
  { name: "Great Value",       emoji: "🛒", category: "grocery" },
  { name: "Nature Valley",     emoji: "🌾", category: "grocery" },
  { name: "Quaker",            emoji: "🥣", category: "grocery" },
  { name: "Cheerios",          emoji: "🥣", category: "grocery" },
  { name: "Oreo",              emoji: "🍪", category: "grocery" },
  { name: "Lay's",             emoji: "🥔", category: "grocery" },
];

export const brandedFoods: BrandedFood[] = [
  // ===== McDonald's =====
  { id: "preset:mcd-hash-brown",   brand: "McDonald's", name: "Hash Brown",            serving: "1 piece",   kcal: 140, protein: 1,  carbs: 16, fat: 8,  category: "restaurant", emoji: "🥔" },
  { id: "preset:mcd-big-mac",      brand: "McDonald's", name: "Big Mac",               serving: "1 burger",  kcal: 590, protein: 25, carbs: 46, fat: 34, category: "restaurant", emoji: "🍔" },
  { id: "preset:mcd-mcchicken",    brand: "McDonald's", name: "McChicken",             serving: "1 sandwich",kcal: 400, protein: 14, carbs: 39, fat: 21, category: "restaurant", emoji: "🍔" },
  { id: "preset:mcd-quarter",      brand: "McDonald's", name: "Quarter Pounder w/Cheese", serving: "1 burger", kcal: 520, protein: 30, carbs: 42, fat: 26, category: "restaurant", emoji: "🍔" },
  { id: "preset:mcd-mcmuffin-egg", brand: "McDonald's", name: "Egg McMuffin",          serving: "1 muffin",  kcal: 310, protein: 17, carbs: 30, fat: 13, category: "restaurant", emoji: "🥪" },
  { id: "preset:mcd-fries-med",    brand: "McDonald's", name: "Medium Fries",          serving: "1 medium",  kcal: 320, protein: 4,  carbs: 43, fat: 15, category: "restaurant", emoji: "🍟" },
  { id: "preset:mcd-nuggets-10",   brand: "McDonald's", name: "Chicken McNuggets",     serving: "10 pieces", kcal: 410, protein: 23, carbs: 25, fat: 24, category: "restaurant", emoji: "🍗" },

  // ===== Tim Hortons =====
  { id: "preset:tim-hash-brown",   brand: "Tim Hortons", name: "Hash Browns",          serving: "2 pieces",  kcal: 130, protein: 2,  carbs: 14, fat: 8,  category: "restaurant", emoji: "🥔" },
  { id: "preset:tim-double-double",brand: "Tim Hortons", name: "Double Double Coffee", serving: "Medium",    kcal: 200, protein: 3,  carbs: 22, fat: 11, category: "restaurant", emoji: "☕" },
  { id: "preset:tim-iced-capp",    brand: "Tim Hortons", name: "Iced Capp",            serving: "Medium",    kcal: 320, protein: 4,  carbs: 50, fat: 12, category: "restaurant", emoji: "🧋" },
  { id: "preset:tim-bagel-plain",  brand: "Tim Hortons", name: "Plain Bagel",          serving: "1 bagel",   kcal: 290, protein: 11, carbs: 56, fat: 2,  category: "restaurant", emoji: "🥯" },
  { id: "preset:tim-honey-cruller",brand: "Tim Hortons", name: "Honey Cruller Donut",  serving: "1 donut",   kcal: 320, protein: 2,  carbs: 39, fat: 18, category: "restaurant", emoji: "🍩" },

  // ===== Subway (6") =====
  { id: "preset:sub-turkey-6",     brand: "Subway", name: "Turkey Breast 6\"",      serving: "6-inch sub", kcal: 280, protein: 18, carbs: 46, fat: 3.5, category: "restaurant", emoji: "🥪" },
  { id: "preset:sub-italian-bmt-6",brand: "Subway", name: "Italian B.M.T. 6\"",     serving: "6-inch sub", kcal: 410, protein: 20, carbs: 46, fat: 16,  category: "restaurant", emoji: "🥪" },
  { id: "preset:sub-tuna-6",       brand: "Subway", name: "Tuna 6\"",               serving: "6-inch sub", kcal: 480, protein: 20, carbs: 44, fat: 25,  category: "restaurant", emoji: "🥪" },
  { id: "preset:sub-meatball-6",   brand: "Subway", name: "Meatball Marinara 6\"",  serving: "6-inch sub", kcal: 480, protein: 21, carbs: 60, fat: 18,  category: "restaurant", emoji: "🥪" },

  // ===== Starbucks =====
  { id: "preset:sbux-iced-coffee", brand: "Starbucks", name: "Iced Coffee (unsweetened)", serving: "Grande 16oz", kcal: 5,   protein: 1,  carbs: 0,  fat: 0,  category: "restaurant", emoji: "🧊" },
  { id: "preset:sbux-caramel-macc",brand: "Starbucks", name: "Caramel Macchiato",         serving: "Grande 2% milk", kcal: 250, protein: 10, carbs: 35, fat: 7,  category: "restaurant", emoji: "☕" },
  { id: "preset:sbux-psl",         brand: "Starbucks", name: "Pumpkin Spice Latte",       serving: "Grande 2% milk", kcal: 390, protein: 14, carbs: 52, fat: 14, category: "restaurant", emoji: "🎃" },
  { id: "preset:sbux-vanilla-latte",brand:"Starbucks", name: "Vanilla Latte",             serving: "Grande 2% milk", kcal: 250, protein: 12, carbs: 35, fat: 6,  category: "restaurant", emoji: "☕" },
  { id: "preset:sbux-cold-brew",   brand: "Starbucks", name: "Cold Brew (unsweetened)",   serving: "Grande 16oz",   kcal: 5,   protein: 1,  carbs: 0,  fat: 0,  category: "restaurant", emoji: "🧊" },
  { id: "preset:sbux-pink-drink",  brand: "Starbucks", name: "Pink Drink",                serving: "Grande 16oz",   kcal: 140, protein: 1,  carbs: 27, fat: 3,  category: "restaurant", emoji: "🩷" },

  // ===== Chipotle =====
  { id: "preset:chip-chicken-bowl",brand: "Chipotle", name: "Chicken Bowl",                serving: "Rice + beans + chicken + salsa + lettuce", kcal: 620, protein: 50, carbs: 65, fat: 19, category: "restaurant", emoji: "🌯" },
  { id: "preset:chip-steak-bowl",  brand: "Chipotle", name: "Steak Bowl",                  serving: "Rice + beans + steak + salsa + lettuce",   kcal: 595, protein: 41, carbs: 65, fat: 19, category: "restaurant", emoji: "🌯" },
  { id: "preset:chip-burrito-chk", brand: "Chipotle", name: "Chicken Burrito",             serving: "Tortilla + rice + beans + chicken",        kcal: 985, protein: 53, carbs:118, fat: 32, category: "restaurant", emoji: "🌯" },

  // ===== Wendy's =====
  { id: "preset:wen-daves-single", brand: "Wendy's", name: "Dave's Single",       serving: "1 burger", kcal: 590, protein: 30, carbs: 39, fat: 34, category: "restaurant", emoji: "🍔" },
  { id: "preset:wen-baconator",    brand: "Wendy's", name: "Baconator",           serving: "1 burger", kcal: 950, protein: 60, carbs: 39, fat: 62, category: "restaurant", emoji: "🥓" },
  { id: "preset:wen-spicy-chk",    brand: "Wendy's", name: "Spicy Chicken Sandwich", serving: "1 sandwich", kcal: 500, protein: 28, carbs: 50, fat: 22, category: "restaurant", emoji: "🍔" },

  // ===== A&W =====
  { id: "preset:aw-mama-burger",   brand: "A&W", name: "Mama Burger",         serving: "1 burger", kcal: 580, protein: 27, carbs: 39, fat: 34, category: "restaurant", emoji: "🍔" },
  { id: "preset:aw-teen-burger",   brand: "A&W", name: "Teen Burger",         serving: "1 burger", kcal: 690, protein: 30, carbs: 39, fat: 43, category: "restaurant", emoji: "🍔" },
  { id: "preset:aw-onion-rings",   brand: "A&W", name: "Onion Rings",         serving: "Medium",   kcal: 460, protein: 6,  carbs: 51, fat: 26, category: "restaurant", emoji: "🧅" },

  // ===== Popeyes =====
  { id: "preset:pop-classic-chk-sw",brand:"Popeyes", name: "Classic Chicken Sandwich", serving: "1 sandwich", kcal: 700, protein: 28, carbs: 50, fat: 42, category: "restaurant", emoji: "🍔" },
  { id: "preset:pop-spicy-chk-sw", brand: "Popeyes", name: "Spicy Chicken Sandwich",   serving: "1 sandwich", kcal: 700, protein: 28, carbs: 50, fat: 42, category: "restaurant", emoji: "🌶️" },
  { id: "preset:pop-tender-3",     brand: "Popeyes", name: "Chicken Tenders",          serving: "3 tenders",  kcal: 310, protein: 28, carbs: 16, fat: 16, category: "restaurant", emoji: "🍗" },

  // ===== PRIME =====
  { id: "preset:prime-prot-choc",  brand: "PRIME", name: "Protein Shake — Chocolate", serving: "12 fl oz", kcal: 140, protein: 25, carbs: 9, fat: 1,   category: "protein", emoji: "🍫" },
  { id: "preset:prime-prot-van",   brand: "PRIME", name: "Protein Shake — Vanilla",   serving: "12 fl oz", kcal: 140, protein: 25, carbs: 9, fat: 1,   category: "protein", emoji: "🍦" },
  { id: "preset:prime-prot-straw", brand: "PRIME", name: "Protein Shake — Strawberry",serving: "12 fl oz", kcal: 140, protein: 25, carbs: 9, fat: 1,   category: "protein", emoji: "🍓" },
  { id: "preset:prime-hydration",  brand: "PRIME", name: "Hydration Drink",           serving: "16.9 fl oz",kcal: 25, protein: 0,  carbs: 2, fat: 0,   category: "protein", emoji: "💧" },

  // ===== Fairlife =====
  { id: "preset:fair-corepower-choc", brand: "Fairlife", name: "Core Power 26g — Chocolate", serving: "14 fl oz", kcal: 170, protein: 26, carbs: 9,  fat: 4.5, category: "protein", emoji: "🥛" },
  { id: "preset:fair-corepower-van",  brand: "Fairlife", name: "Core Power 26g — Vanilla",   serving: "14 fl oz", kcal: 170, protein: 26, carbs: 9,  fat: 4.5, category: "protein", emoji: "🥛" },
  { id: "preset:fair-corepower-elite",brand: "Fairlife", name: "Core Power Elite 42g — Chocolate", serving: "14 fl oz", kcal: 230, protein: 42, carbs: 12, fat: 4.5, category: "protein", emoji: "🥛" },
  { id: "preset:fair-plan-choc",      brand: "Fairlife", name: "Nutrition Plan — Chocolate", serving: "11.5 fl oz", kcal: 150, protein: 30, carbs: 5,  fat: 2.5, category: "protein", emoji: "🥛" },

  // ===== Quest =====
  { id: "preset:quest-bar-cccd", brand: "Quest", name: "Protein Bar — Choc Chip Cookie Dough", serving: "1 bar (60g)", kcal: 190, protein: 21, carbs: 21, fat: 8, category: "protein", emoji: "🍪" },
  { id: "preset:quest-bar-bd",   brand: "Quest", name: "Protein Bar — Birthday Cake",          serving: "1 bar (60g)", kcal: 190, protein: 20, carbs: 22, fat: 8, category: "protein", emoji: "🎂" },
  { id: "preset:quest-bar-cnc",  brand: "Quest", name: "Protein Bar — Cookies & Cream",        serving: "1 bar (60g)", kcal: 190, protein: 21, carbs: 22, fat: 8, category: "protein", emoji: "🍪" },
  { id: "preset:quest-chips-cheddar", brand: "Quest", name: "Protein Chips — Nacho Cheese",    serving: "1 bag (32g)", kcal: 140, protein: 19, carbs: 4,  fat: 5, category: "protein", emoji: "🧀" },

  // ===== Premier Protein =====
  { id: "preset:prem-shake-choc",  brand: "Premier Protein", name: "Shake — Chocolate", serving: "11 fl oz", kcal: 160, protein: 30, carbs: 4, fat: 3, category: "protein", emoji: "🍫" },
  { id: "preset:prem-shake-van",   brand: "Premier Protein", name: "Shake — Vanilla",   serving: "11 fl oz", kcal: 160, protein: 30, carbs: 4, fat: 3, category: "protein", emoji: "🍦" },
  { id: "preset:prem-shake-caramel",brand:"Premier Protein", name: "Shake — Caramel",   serving: "11 fl oz", kcal: 160, protein: 30, carbs: 5, fat: 3, category: "protein", emoji: "🍮" },

  // ===== Muscle Milk =====
  { id: "preset:mm-genuine-choc",  brand: "Muscle Milk", name: "Genuine — Chocolate", serving: "14 fl oz", kcal: 160, protein: 25, carbs: 9, fat: 5, category: "protein", emoji: "💪" },
  { id: "preset:mm-genuine-van",   brand: "Muscle Milk", name: "Genuine — Vanilla",   serving: "14 fl oz", kcal: 160, protein: 25, carbs: 9, fat: 5, category: "protein", emoji: "💪" },

  // ===== Celsius =====
  { id: "preset:cel-original",     brand: "Celsius", name: "Original Energy Drink",  serving: "12 fl oz",  kcal: 10, protein: 0, carbs: 2, fat: 0, category: "protein", emoji: "⚡" },
  { id: "preset:cel-essentials",   brand: "Celsius", name: "Essentials",             serving: "16 fl oz",  kcal: 15, protein: 0, carbs: 4, fat: 0, category: "protein", emoji: "⚡" },

  // ===== Gatorade =====
  { id: "preset:gat-lemon-lime",   brand: "Gatorade", name: "Thirst Quencher — Lemon-Lime", serving: "20 fl oz", kcal: 140, protein: 0, carbs: 36, fat: 0, category: "protein", emoji: "🥤" },
  { id: "preset:gat-cool-blue",    brand: "Gatorade", name: "Thirst Quencher — Cool Blue",  serving: "20 fl oz", kcal: 140, protein: 0, carbs: 36, fat: 0, category: "protein", emoji: "🥤" },
  { id: "preset:gat-fruit-punch",  brand: "Gatorade", name: "Thirst Quencher — Fruit Punch",serving: "20 fl oz", kcal: 140, protein: 0, carbs: 36, fat: 0, category: "protein", emoji: "🥤" },

  // ===== Optimum Nutrition =====
  { id: "preset:on-gold-choc",     brand: "Optimum Nutrition", name: "Gold Standard Whey — Double Rich Chocolate", serving: "1 scoop (30g)", kcal: 120, protein: 24, carbs: 3, fat: 1, category: "protein", emoji: "🥄" },
  { id: "preset:on-gold-van",      brand: "Optimum Nutrition", name: "Gold Standard Whey — Vanilla Ice Cream",     serving: "1 scoop (30g)", kcal: 120, protein: 24, carbs: 3, fat: 1, category: "protein", emoji: "🥄" },

  // ===== Kirkland =====
  { id: "preset:kirk-eggs",        brand: "Kirkland", name: "Organic Large Egg",        serving: "1 egg",   kcal: 70, protein: 6, carbs: 0, fat: 5, category: "grocery", emoji: "🥚" },
  { id: "preset:kirk-rotis-chk",   brand: "Kirkland", name: "Rotisserie Chicken Breast",serving: "3 oz",    kcal: 140, protein: 24, carbs: 0, fat: 4, category: "grocery", emoji: "🍗" },

  // ===== Great Value =====
  { id: "preset:gv-2-milk",        brand: "Great Value", name: "2% Reduced Fat Milk",   serving: "1 cup (240ml)", kcal: 122, protein: 8, carbs: 12, fat: 5, category: "grocery", emoji: "🥛" },
  { id: "preset:gv-whole-milk",    brand: "Great Value", name: "Whole Milk",            serving: "1 cup (240ml)", kcal: 150, protein: 8, carbs: 12, fat: 8, category: "grocery", emoji: "🥛" },

  // ===== Nature Valley =====
  { id: "preset:nv-oats-honey",    brand: "Nature Valley", name: "Crunchy Granola — Oats 'n Honey", serving: "1 pouch (2 bars)", kcal: 190, protein: 3, carbs: 29, fat: 7, category: "grocery", emoji: "🌾" },
  { id: "preset:nv-protein",       brand: "Nature Valley", name: "Protein Chewy Bar — Salted Caramel", serving: "1 bar (40g)",     kcal: 190, protein: 10, carbs: 14, fat: 12, category: "grocery", emoji: "🌾" },

  // ===== Quaker =====
  { id: "preset:qua-old-oats",     brand: "Quaker", name: "Old Fashioned Oats",         serving: "1/2 cup dry (40g)", kcal: 150, protein: 5, carbs: 27, fat: 3, category: "grocery", emoji: "🥣" },
  { id: "preset:qua-instant-msb",  brand: "Quaker", name: "Instant Oatmeal — Maple & Brown Sugar", serving: "1 packet (43g)", kcal: 160, protein: 4, carbs: 32, fat: 2, category: "grocery", emoji: "🥣" },

  // ===== Cheerios =====
  { id: "preset:chrs-original",    brand: "Cheerios", name: "Original",         serving: "1 cup (28g)", kcal: 100, protein: 3, carbs: 20, fat: 2, category: "grocery", emoji: "🥣" },
  { id: "preset:chrs-honey-nut",   brand: "Cheerios", name: "Honey Nut",        serving: "1 cup (37g)", kcal: 140, protein: 3, carbs: 29, fat: 2, category: "grocery", emoji: "🥣" },

  // ===== Oreo =====
  { id: "preset:oreo-original",    brand: "Oreo", name: "Original Cookies",        serving: "3 cookies (34g)", kcal: 160, protein: 1, carbs: 25, fat: 7, category: "grocery", emoji: "🍪" },
  { id: "preset:oreo-double",      brand: "Oreo", name: "Double Stuf Cookies",     serving: "2 cookies (29g)", kcal: 140, protein: 1, carbs: 21, fat: 7, category: "grocery", emoji: "🍪" },

  // ===== Lay's =====
  { id: "preset:lays-classic",     brand: "Lay's", name: "Classic Potato Chips",  serving: "1 oz (28g)", kcal: 160, protein: 2, carbs: 15, fat: 10, category: "grocery", emoji: "🥔" },
  { id: "preset:lays-sco",         brand: "Lay's", name: "Sour Cream & Onion",    serving: "1 oz (28g)", kcal: 160, protein: 2, carbs: 15, fat: 10, category: "grocery", emoji: "🧅" },
  { id: "preset:lays-bbq",         brand: "Lay's", name: "Barbecue",              serving: "1 oz (28g)", kcal: 160, protein: 2, carbs: 15, fat: 10, category: "grocery", emoji: "🍖" },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Search the local curated preset list. Returns highest-quality matches first. */
export function searchBrandedPresets(query: string, category?: BrandCategory | "all"): BrandedFood[] {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(" ").filter(Boolean);
  const pool = category && category !== "all" ? brandedFoods.filter((f) => f.category === category) : brandedFoods;
  const scored = pool
    .map((f) => {
      const hay = norm(`${f.brand} ${f.name}`);
      let score = 0;
      for (const t of tokens) {
        if (!hay.includes(t)) return { f, score: -1 };
        if (norm(f.brand).startsWith(t)) score += 5;
        if (hay.startsWith(t)) score += 3;
        score += 1;
      }
      return { f, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((x) => x.f);
  return scored;
}

export function findPresetById(id: string): BrandedFood | undefined {
  return brandedFoods.find((f) => f.id === id);
}

/** Lightweight branded-match for AI photo results (does the detected item name look like a brand we know?). */
export function suggestBrandedMatchForName(name: string): BrandedFood | undefined {
  const matches = searchBrandedPresets(name);
  return matches[0];
}
