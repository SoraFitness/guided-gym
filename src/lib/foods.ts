export interface Food {
  id: string;
  name: string;
  brand?: string;
  emoji: string;
  serving: string;
  kcal: number;
  protein: number; // g
  carbs: number;
  fat: number;
  tags: string[];
}

export const foods: Food[] = [
  {
    id: "hashbrowns",
    name: "Hashbrowns",
    emoji: "🥔",
    serving: "1 patty (60g)",
    kcal: 140,
    protein: 2,
    carbs: 15,
    fat: 9,
    tags: ["breakfast"],
  },
  {
    id: "eggs",
    name: "Scrambled eggs",
    emoji: "🍳",
    serving: "2 large eggs",
    kcal: 180,
    protein: 13,
    carbs: 1,
    fat: 14,
    tags: ["breakfast", "high-protein"],
  },
  {
    id: "oatmeal",
    name: "Oatmeal",
    emoji: "🥣",
    serving: "1 cup cooked",
    kcal: 160,
    protein: 6,
    carbs: 28,
    fat: 3,
    tags: ["breakfast"],
  },
  {
    id: "banana",
    name: "Banana",
    emoji: "🍌",
    serving: "1 medium",
    kcal: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    tags: ["snack", "fruit"],
  },
  {
    id: "greek-yogurt",
    name: "Greek yogurt",
    emoji: "🥛",
    serving: "1 cup (240g)",
    kcal: 150,
    protein: 17,
    carbs: 9,
    fat: 4,
    tags: ["high-protein"],
  },
  {
    id: "chicken-breast",
    name: "Chicken breast",
    emoji: "🍗",
    serving: "150g grilled",
    kcal: 240,
    protein: 45,
    carbs: 0,
    fat: 6,
    tags: ["lunch", "dinner", "high-protein"],
  },
  {
    id: "salmon",
    name: "Salmon",
    emoji: "🐟",
    serving: "120g fillet",
    kcal: 250,
    protein: 25,
    carbs: 0,
    fat: 16,
    tags: ["dinner", "high-protein"],
  },
  {
    id: "brown-rice",
    name: "Brown rice",
    emoji: "🍚",
    serving: "1 cup cooked",
    kcal: 215,
    protein: 5,
    carbs: 45,
    fat: 2,
    tags: ["lunch", "dinner"],
  },
  {
    id: "avocado",
    name: "Avocado",
    emoji: "🥑",
    serving: "1/2 medium",
    kcal: 160,
    protein: 2,
    carbs: 9,
    fat: 15,
    tags: ["snack"],
  },
  {
    id: "almonds",
    name: "Almonds",
    emoji: "🌰",
    serving: "1 oz (28g)",
    kcal: 165,
    protein: 6,
    carbs: 6,
    fat: 14,
    tags: ["snack"],
  },
  {
    id: "protein-shake",
    name: "Protein shake",
    emoji: "🥤",
    serving: "1 scoop + water",
    kcal: 130,
    protein: 25,
    carbs: 3,
    fat: 2,
    tags: ["high-protein", "post-workout"],
  },
  {
    id: "sweet-potato",
    name: "Sweet potato",
    emoji: "🍠",
    serving: "1 medium baked",
    kcal: 180,
    protein: 4,
    carbs: 41,
    fat: 0,
    tags: ["lunch", "dinner"],
  },
  {
    id: "broccoli",
    name: "Broccoli",
    emoji: "🥦",
    serving: "1 cup steamed",
    kcal: 55,
    protein: 4,
    carbs: 11,
    fat: 1,
    tags: ["veg"],
  },
  {
    id: "toast",
    name: "Whole-grain toast",
    emoji: "🍞",
    serving: "2 slices",
    kcal: 180,
    protein: 8,
    carbs: 30,
    fat: 3,
    tags: ["breakfast"],
  },
  {
    id: "coffee-latte",
    name: "Latte",
    emoji: "☕",
    serving: "12 oz oat milk",
    kcal: 130,
    protein: 4,
    carbs: 18,
    fat: 4,
    tags: ["drink"],
  },
  {
    id: "apple",
    name: "Apple",
    emoji: "🍎",
    serving: "1 medium",
    kcal: 95,
    protein: 0,
    carbs: 25,
    fat: 0,
    tags: ["snack", "fruit"],
  },
];

export const meals = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type Meal = (typeof meals)[number];
export type LogSource = "preset" | "manual" | "barcode" | "image";

export interface LogEntry {
  id: string;
  meal: Meal;
  servings: number;
  loggedAt: string; // ISO
  // Either preset reference...
  foodId?: string;
  // ...or inline custom food (manual / barcode / image)
  custom?: {
    name: string;
    brand?: string;
    imageUrl?: string;
    emoji?: string;
    serving: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    source: LogSource;
  };
}

const KEY = "fitness:foodlog";

export function loadLog(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLog(entries: LogEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function entriesOn(entries: LogEntry[], date: Date): LogEntry[] {
  const d = date.toDateString();
  return entries.filter((e) => new Date(e.loggedAt).toDateString() === d);
}

export function entryFood(e: LogEntry): {
  name: string;
  brand?: string;
  imageUrl?: string;
  emoji: string;
  serving: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  if (e.custom) return { emoji: "🍽️", ...e.custom };
  const f = foods.find((x) => x.id === e.foodId);
  if (!f)
    return { name: "Unknown", emoji: "❓", serving: "", kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return f;
}

export function macrosFor(entries: LogEntry[]) {
  return entries.reduce(
    (acc, e) => {
      const f = entryFood(e);
      acc.kcal += f.kcal * e.servings;
      acc.protein += f.protein * e.servings;
      acc.carbs += f.carbs * e.servings;
      acc.fat += f.fat * e.servings;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ---------- Nutrition goals ----------
export interface NutritionGoals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}
export const DEFAULT_GOALS: NutritionGoals = { kcal: 2100, protein: 140, carbs: 230, fat: 70 };
const GOAL_KEY = "fitness:goals";

export function loadGoals(): NutritionGoals {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? { ...DEFAULT_GOALS, ...JSON.parse(raw) } : DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}
export function saveGoals(g: NutritionGoals) {
  localStorage.setItem(GOAL_KEY, JSON.stringify(g));
}

/** Quick suggestion from weight (Mifflin-ish) */
export function suggestGoals(weightKg = 75): NutritionGoals {
  const kcal = Math.round(weightKg * 30);
  const protein = Math.round(weightKg * 1.8);
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
  return { kcal, protein, carbs, fat };
}
