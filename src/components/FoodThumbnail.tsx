import {
  EggFried, Salad, UtensilsCrossed, Cookie, Drumstick, Wheat, Nut, Apple,
  Coffee, Leaf, Utensils, Fish, Milk, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FoodCategory =
  | "breakfast" | "lunch" | "dinner" | "snack"
  | "protein" | "carbs" | "fats" | "fruit" | "drink" | "veg" | "fish" | "dairy"
  | "other";

interface CategoryStyle { gradient: string; ring: string; Icon: LucideIcon; }

const CATEGORY: Record<FoodCategory, CategoryStyle> = {
  breakfast: { gradient: "linear-gradient(135deg, oklch(0.78 0.16 65) 0%, oklch(0.65 0.18 35) 100%)", ring: "oklch(0.78 0.16 65 / 0.35)", Icon: EggFried },
  lunch:     { gradient: "linear-gradient(135deg, oklch(0.78 0.17 145) 0%, oklch(0.58 0.16 165) 100%)", ring: "oklch(0.78 0.17 145 / 0.35)", Icon: Salad },
  dinner:    { gradient: "linear-gradient(135deg, oklch(0.55 0.18 285) 0%, oklch(0.38 0.16 295) 100%)", ring: "oklch(0.55 0.18 285 / 0.35)", Icon: UtensilsCrossed },
  snack:     { gradient: "linear-gradient(135deg, oklch(0.78 0.16 15) 0%, oklch(0.6 0.18 350) 100%)",  ring: "oklch(0.78 0.16 15 / 0.35)",  Icon: Cookie },
  protein:   { gradient: "linear-gradient(135deg, oklch(0.7 0.19 25) 0%, oklch(0.5 0.18 15) 100%)",    ring: "oklch(0.7 0.19 25 / 0.35)",   Icon: Drumstick },
  carbs:     { gradient: "linear-gradient(135deg, oklch(0.82 0.15 75) 0%, oklch(0.62 0.14 55) 100%)",  ring: "oklch(0.82 0.15 75 / 0.3)",   Icon: Wheat },
  fats:      { gradient: "linear-gradient(135deg, oklch(0.85 0.18 115) 0%, oklch(0.6 0.14 125) 100%)", ring: "oklch(0.85 0.18 115 / 0.3)",  Icon: Nut },
  fruit:     { gradient: "linear-gradient(135deg, oklch(0.78 0.18 10) 0%, oklch(0.62 0.18 355) 100%)", ring: "oklch(0.78 0.18 10 / 0.3)",   Icon: Apple },
  drink:     { gradient: "linear-gradient(135deg, oklch(0.55 0.08 60) 0%, oklch(0.32 0.05 50) 100%)",  ring: "oklch(0.55 0.08 60 / 0.3)",   Icon: Coffee },
  veg:       { gradient: "linear-gradient(135deg, oklch(0.72 0.18 145) 0%, oklch(0.5 0.15 155) 100%)", ring: "oklch(0.72 0.18 145 / 0.3)",  Icon: Leaf },
  fish:      { gradient: "linear-gradient(135deg, oklch(0.7 0.13 220) 0%, oklch(0.5 0.14 240) 100%)",  ring: "oklch(0.7 0.13 220 / 0.3)",   Icon: Fish },
  dairy:     { gradient: "linear-gradient(135deg, oklch(0.88 0.04 250) 0%, oklch(0.7 0.06 260) 100%)", ring: "oklch(0.88 0.04 250 / 0.3)",  Icon: Milk },
  other:     { gradient: "linear-gradient(135deg, oklch(0.35 0.01 250) 0%, oklch(0.22 0.01 250) 100%)", ring: "oklch(1 0 0 / 0.06)",        Icon: Utensils },
};

export function categoryForFood(opts: { id?: string; name?: string; tags?: string[] }): FoodCategory {
  const id = (opts.id ?? "").toLowerCase();
  const name = (opts.name ?? "").toLowerCase();
  const tags = opts.tags ?? [];
  const has = (s: string) => id.includes(s) || name.includes(s);
  if (tags.includes("fruit") || has("apple") || has("banana") || has("berry")) return "fruit";
  if (tags.includes("drink") || has("latte") || has("coffee") || has("tea")) return "drink";
  if (tags.includes("veg") || has("broccoli") || has("spinach") || has("kale")) return "veg";
  if (has("salmon") || has("tuna") || has("fish")) return "fish";
  if (has("yogurt") || has("milk") || has("cheese")) return "dairy";
  if (has("chicken") || has("beef") || has("egg") || has("shake") || has("protein")) return "protein";
  if (has("almond") || has("nut") || has("avocado") || has("oil")) return "fats";
  if (has("rice") || has("oat") || has("toast") || has("bread") || has("potato") || has("hashbrown") || has("pasta")) return "carbs";
  return "other";
}

const MEAL_TO_CAT: Record<string, FoodCategory> = {
  breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "snack",
};

type Size = "sm" | "md" | "lg";
const SIZES: Record<Size, { box: string; icon: string; radius: string }> = {
  sm: { box: "size-9",  icon: "size-4",   radius: "rounded-xl" },
  md: { box: "size-11", icon: "size-5",   radius: "rounded-2xl" },
  lg: { box: "size-14", icon: "size-6",   radius: "rounded-2xl" },
};

export function FoodThumbnail({
  food, size = "md", className,
}: {
  food: { id?: string; name?: string; tags?: string[] };
  size?: Size;
  className?: string;
}) {
  const cat = categoryForFood(food);
  return <Tile cat={cat} size={size} className={className} />;
}

export function MealThumbnail({
  meal, size = "md", className,
}: {
  meal: string; size?: Size; className?: string;
}) {
  const cat = MEAL_TO_CAT[meal.toLowerCase()] ?? "other";
  return <Tile cat={cat} size={size} className={className} />;
}

function Tile({ cat, size, className }: { cat: FoodCategory; size: Size; className?: string }) {
  const { gradient, ring, Icon } = CATEGORY[cat];
  const s = SIZES[size];
  return (
    <div
      className={cn(
        s.box, s.radius,
        "relative shrink-0 grid place-items-center overflow-hidden",
        "shadow-[0_6px_18px_-10px_rgba(0,0,0,0.7)]",
        className,
      )}
      style={{ background: gradient, boxShadow: `inset 0 0 0 1px ${ring}` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.22), transparent 55%)" }}
      />
      <Icon className={cn(s.icon, "relative text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]")} strokeWidth={2.2} />
    </div>
  );
}
