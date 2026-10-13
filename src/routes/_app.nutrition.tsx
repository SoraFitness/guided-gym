import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Search,
  Plus,
  X,
  ScanLine,
  Sparkles,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Image as ImageIcon,
  Pencil,
  Flame,
  Loader2,
  Upload,
  Minus,
  Star,
  ArrowLeft,
  BadgeCheck,
  History,
  Heart,
  Utensils,
  Zap,
  Wheat,
  Droplet,
  type LucideIcon,
} from "lucide-react";
import {
  foods,
  meals,
  entriesOn,
  macrosFor,
  entryFood,
  type Meal,
  type LogEntry,
  type Food,
  type NutritionGoals,
} from "@/lib/foods";
import {
  useNutrition,
  addEntry as storeAdd,
  updateEntry as storeUpdate,
  removeEntry as storeRemove,
  setNutritionGoals,
} from "@/lib/nutritionStore";
import { suggestNutrition } from "@/lib/nutritionService";
import { BodyPortal } from "@/components/app/BodyPortal";
import { FoodThumbnail, MealThumbnail } from "@/components/FoodThumbnail";
import { BrandLogo } from "@/components/BrandLogo";
import { resultToCustom, type LookupResult } from "@/lib/foodLookup";
import { analyzeFoodImage, type FoodScanItem, type FoodScanResult } from "@/lib/foodScan.functions";
import { searchFoodDatabase, type FoodSearchResult } from "@/lib/foodSearch.functions";
import {
  brandedFoods,
  popularBrands,
  searchBrandedPresets,
  findPresetById,
  type BrandedFood,
  type BrandCategory,
} from "@/lib/brandedFoods";
import { getFoodImageUrl } from "@/lib/foodImages";
import {
  useRecentFoods,
  useFavoriteFoods,
  pushRecent,
  toggleFavorite,
  isFavorite,
  resultToStored,
  type StoredFood,
} from "@/lib/foodHistoryStore";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  scoreLogEntries,
  scoreNutritionQuality,
  type NutrientDetails,
  type NutritionQuality,
} from "@/lib/nutritionQuality";
import { compressImage } from "@/lib/imageCompress";
import { FoodCameraPanel } from "@/components/nutrition/FoodCameraPanel";
import { readNutritionLabel } from "@/lib/nutritionLabel.functions";
import { useProfile, type Goal, type Profile } from "@/lib/profile";
import {
  cardClass,
  HeroCard,
  iconButtonClass,
  Kicker,
  MACRO_COLORS,
  Page,
  PageHeader,
  primaryButtonClass,
  ProgressRing,
  scoreColor,
  SectionHeader,
  StackedBar,
  StatTile,
} from "@/components/app/kit";

const BarcodeScannerPanel = lazy(() =>
  import("@/components/BarcodeScannerPanel").then((module) => ({
    default: module.BarcodeScannerPanel,
  })),
);

export const Route = createFileRoute("/_app/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Ascendr" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const [day, setDay] = useState<Date>(new Date());
  const { entries, goals } = useNutrition(day);
  const { profile } = useProfile();
  const [addFor, setAddFor] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const today = useMemo(() => entriesOn(entries, day), [entries, day]);
  const totals = macrosFor(today);
  const quality = useMemo(() => scoreLogEntries(today, goals.protein), [today, goals.protein]);

  const add = (entry: Omit<LogEntry, "id" | "loggedAt"> & { loggedAt?: string }) => {
    // Today's food is logged at the current time, not when this page was opened,
    // so it lands on the same day Home and the daily totals are showing.
    const isViewingToday = day.toDateString() === new Date().toDateString();
    storeAdd({
      ...entry,
      loggedAt: entry.loggedAt ?? (isViewingToday ? new Date() : day).toISOString(),
    });
  };
  const update = (id: string, patch: Partial<LogEntry>) => storeUpdate(id, patch);
  const remove = (id: string) => storeRemove(id);

  const isToday = day.toDateString() === new Date().toDateString();
  const kcalEaten = Math.round(totals.kcal);
  const kcalRemaining = goals.kcal - kcalEaten;
  const proteinToGo = Math.max(0, Math.round(goals.protein - totals.protein));
  const loggedCount = today.length;

  return (
    <Page className="pb-40">
      <PageHeader
        kicker={
          isToday
            ? `Today · ${day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`
            : day.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
        }
        title="Fuel"
        actions={
          <button
            type="button"
            onClick={() => setAddFor(currentMeal())}
            aria-label="Add food"
            className={iconButtonClass}
          >
            <Plus />
          </button>
        }
      />

      <div className="mt-4">
        <DayTabs day={day} setDay={setDay} />
      </div>

      {/* Calories */}
      <HeroCard className="mt-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Kicker accent>{kcalRemaining < 0 ? "Calories over" : "Calories left"}</Kicker>
            <p className="mt-1.5 text-[48px] font-bold leading-none tracking-[-0.045em] tabular-nums">
              {Math.abs(kcalRemaining).toLocaleString()}
            </p>
            <p className="mt-2 truncate text-[14px] text-muted-foreground">
              {kcalEaten.toLocaleString()} eaten of {goals.kcal.toLocaleString()} kcal
            </p>
          </div>
          <ProgressRing
            value={goals.kcal ? kcalEaten / goals.kcal : 0}
            size={96}
            stroke={10}
            color={kcalRemaining < 0 ? "var(--color-score-mid)" : "var(--color-neon)"}
          >
            <span className="text-[18px] font-bold tabular-nums">
              {goals.kcal ? Math.round((kcalEaten / goals.kcal) * 100) : 0}%
            </span>
          </ProgressRing>
        </div>
        <StackedBar
          className="mt-5"
          max={goals.kcal}
          segments={[
            { label: "Protein", value: totals.protein * 4, color: MACRO_COLORS.protein },
            { label: "Carbs", value: totals.carbs * 4, color: MACRO_COLORS.carbs },
            { label: "Fat", value: totals.fat * 9, color: MACRO_COLORS.fat },
          ]}
        />
        <div className="mt-3 flex items-center gap-4 text-[13px] text-muted-foreground">
          {(
            [
              ["Protein", MACRO_COLORS.protein],
              ["Carbs", MACRO_COLORS.carbs],
              ["Fat", MACRO_COLORS.fat],
            ] as const
          ).map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
          <span className="ml-auto">
            <FuelScorePill quality={quality.day} />
          </span>
        </div>
      </HeroCard>

      {/* Macros */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatTile
          label="Protein"
          value={totals.protein}
          goal={goals.protein}
          unit="g"
          color={MACRO_COLORS.protein}
        />
        <StatTile
          label="Carbs"
          value={totals.carbs}
          goal={goals.carbs}
          unit="g"
          color={MACRO_COLORS.carbs}
        />
        <StatTile
          label="Fat"
          value={totals.fat}
          goal={goals.fat}
          unit="g"
          color={MACRO_COLORS.fat}
        />
      </div>

      {proteinToGo > 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-neon/20 bg-neon/[0.06] px-4 py-3.5">
          <Zap className="size-5 shrink-0 text-neon" />
          <p className="text-[14px] font-medium leading-snug">
            {proteinToGo}g protein to go. {proteinReason(profile?.goal)}
          </p>
        </div>
      ) : (
        loggedCount > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-[18px] border border-score-high/25 bg-score-high/[0.08] px-4 py-3.5">
            <Check className="size-5 shrink-0 text-score-high" />
            <p className="text-[14px] font-medium">Protein goal hit. Nice work.</p>
          </div>
        )
      )}

      {isToday && profile && <TargetRefreshCard goals={goals} profile={profile} />}

      {quality.day.score != null && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <QualitySignal
            label="Positive"
            value={quality.day.positives[0] ?? "Nutrition details tracked"}
            positive
          />
          <QualitySignal
            label="Watch"
            value={quality.day.watchItems[0] ?? "No major watch item detected"}
          />
        </div>
      )}

      <SectionHeader
        className="mt-7"
        title={isToday ? "Today's meals" : "Meals"}
        meta={`${loggedCount} logged`}
      />

      {/* Sticky log button, above the tab bar */}
      <div
        className="pointer-events-none fixed inset-x-0 z-40 mx-auto max-w-md px-4 sm:px-5"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.4rem)" }}
      >
        <button
          type="button"
          onClick={() => setAddFor(currentMeal())}
          data-tour="tour-nutrition-log"
          className={cn(primaryButtonClass, "pointer-events-auto")}
        >
          <Camera /> Log a meal
        </button>
      </div>

      {/* Meal sections */}
      <div className="space-y-3">
        {meals.map((m) => {
          const items = today.filter((e) => e.meal === m);
          const mTotals = macrosFor(items);
          return (
            <MealSection
              key={m}
              meal={m}
              items={items}
              totals={mTotals}
              quality={quality.meals[m]?.quality ?? null}
              proteinGoal={goals.protein}
              onAdd={() => setAddFor(m)}
              onEdit={(e) => setEditing(e)}
              onRemove={remove}
              onServings={(id, s) =>
                update(id, { servings: Math.max(0.25, Math.round(s * 4) / 4) })
              }
            />
          );
        })}
      </div>

      {addFor && (
        <AddFoodModal
          meal={addFor}
          proteinGoal={goals.protein}
          onClose={() => setAddFor(null)}
          onAdd={(entry) => {
            add(entry);
            setAddFor(null);
          }}
        />
      )}
      {editing && (
        <AddFoodModal
          meal={editing.meal}
          proteinGoal={goals.protein}
          editEntry={editing}
          onClose={() => setEditing(null)}
          onAdd={(entry) => {
            update(editing.id, entry);
            setEditing(null);
          }}
        />
      )}
    </Page>
  );
}

function proteinReason(goal?: Goal) {
  if (goal === "lose_weight" || goal === "recomp") return "It keeps muscle while you cut.";
  if (goal === "build_muscle" || goal === "get_stronger") return "It's what builds new muscle.";
  return "It keeps you full and recovering.";
}

function FuelScorePill({ quality }: { quality: NutritionQuality }) {
  if (quality.score == null) return null;
  return (
    <span
      title={`Fuel score ${quality.score} · ${quality.band}`}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold"
      style={{
        color: scoreColor(quality.score),
        backgroundColor: `color-mix(in oklch, ${scoreColor(quality.score)} 14%, transparent)`,
      }}
    >
      <Sparkles className="size-3.5" /> {quality.score}
    </span>
  );
}

function QualitySignal({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-hairline bg-surface p-3.5">
      <p
        className={cn(
          "text-[11px] font-bold uppercase tracking-[0.1em]",
          positive ? "text-score-high" : "text-score-mid",
        )}
      >
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-foreground/80">{value}</p>
    </div>
  );
}

// A single dot keeps a logged item's fuel quality readable without stealing
// the row width the food name needs.
function QualityDot({ quality }: { quality: NutritionQuality }) {
  const score = quality.score;
  return (
    <span
      title={score == null ? "Partial data" : `Fuel score ${score} · ${quality.band}`}
      aria-label={score == null ? "Partial nutrition data" : `Fuel score ${score}, ${quality.band}`}
      className={cn(
        "size-2 shrink-0 rounded-full",
        score == null
          ? "bg-white/20"
          : score >= 70
            ? "bg-analytics-teal"
            : score >= 55
              ? "bg-neon"
              : "bg-analytics-amber",
      )}
    />
  );
}

function QualityBadge({ quality }: { quality: NutritionQuality }) {
  const score = quality.score;
  const unrated = score == null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em]",
        unrated
          ? "border-white/[0.07] bg-white/[0.035] text-white/35"
          : (score ?? 0) >= 70
            ? "border-analytics-teal/20 bg-analytics-teal/10 text-analytics-teal"
            : (score ?? 0) >= 55
              ? "border-neon/20 bg-neon/10 text-neon"
              : "border-analytics-amber/20 bg-analytics-amber/10 text-analytics-amber",
      )}
    >
      {unrated ? "Partial data" : `${quality.score} · ${quality.band}`}
    </span>
  );
}

function currentMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snack";
}

function DayTabs({ day, setDay }: { day: Date; setDay: (d: Date) => void }) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const onToday = sameDay(day, now);
  const onYesterday = sameDay(day, yesterday);
  const shift = (delta: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(d);
  };

  const tab = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={cn(
        "h-10 rounded-full px-4 text-[14px] font-semibold transition",
        active ? "bg-white/[0.1] text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 rounded-full border border-hairline bg-surface p-1">
      {tab("Today", onToday, () => setDay(new Date()))}
      {tab("Yesterday", onYesterday, () => setDay(yesterday))}
      {!onToday && !onYesterday && (
        <span className="rounded-full bg-white/[0.1] px-4 py-2 text-[14px] font-semibold">
          {day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => shift(-1)}
          className="grid size-10 place-items-center rounded-full active:bg-surface-2"
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => shift(1)}
          disabled={onToday}
          className="grid size-10 place-items-center rounded-full active:bg-surface-2 disabled:opacity-25"
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const over = goal > 0 && consumed > goal;
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative size-[108px] shrink-0">
      <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
        <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="11" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={over ? "oklch(0.82 0.15 80)" : "url(#calGrad)"}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <defs>
          <linearGradient id="calGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.92 0.21 130)" />
            <stop offset="100%" stopColor="oklch(0.78 0.16 180)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid size-10 place-items-center rounded-full border border-white/[0.07] bg-black/35">
          <Flame className={cn("size-[18px]", over ? "text-analytics-amber" : "text-neon")} />
        </span>
      </div>
    </div>
  );
}

function MacroRingCard({
  label,
  value,
  goal,
  hue,
  Icon,
}: {
  label: string;
  value: number;
  goal: number;
  hue: string;
  Icon: LucideIcon;
}) {
  const eaten = Math.round(value);
  const remaining = Math.round(goal) - eaten;
  const over = remaining < 0;
  const pct = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;
  const C = 2 * Math.PI * 40;
  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.035] px-2 py-3.5 text-center">
      <div className="text-[19px] font-extrabold leading-none tabular-nums">
        {Math.abs(remaining)}
        <span className="text-[13px] font-bold">g</span>
      </div>
      <p className="mt-1 text-[10px] font-medium text-muted-foreground">
        {label} {over ? "over" : "left"}
      </p>
      <div className="relative mx-auto mt-3 size-[58px]">
        <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="oklch(1 0 0 / 0.07)"
            strokeWidth="12"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={hue}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * C} ${C}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="grid size-6 place-items-center rounded-full bg-black/40">
            <Icon className="size-3" style={{ color: hue }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function MacroLetter({ letter, color, value }: { letter: string; color: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="font-bold" style={{ color }}>
        {letter}
      </span>
      {value}g
    </span>
  );
}

function MacroTag({ Icon, hue, value }: { Icon: LucideIcon; hue: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="size-3" style={{ color: hue }} />
      {value}g
    </span>
  );
}

function loggedTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function MealSection({
  meal,
  items,
  totals,
  quality,
  proteinGoal,
  onAdd,
  onEdit,
  onRemove,
  onServings,
}: {
  meal: Meal;
  items: LogEntry[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  quality: NutritionQuality | null;
  proteinGoal: number;
  onAdd: () => void;
  onEdit: (e: LogEntry) => void;
  onRemove: (id: string) => void;
  onServings: (id: string, s: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="overflow-hidden rounded-[22px] border border-hairline bg-surface">
      <div className="flex items-center gap-3 p-4">
        <MealThumbnail meal={meal} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-bold leading-tight">{meal}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {items.length === 0
              ? "No items yet"
              : `${items.length} item${items.length === 1 ? "" : "s"} · ${Math.round(totals.kcal)} kcal`}
          </p>
        </div>
        {quality && <QualityBadge quality={quality} />}
        <button
          onClick={onAdd}
          className="grid size-11 place-items-center rounded-full border border-hairline bg-white/[0.06] text-foreground transition active:scale-95"
          aria-label={`Add to ${meal}`}
        >
          <Plus className="size-5" />
        </button>
      </div>

      {items.length > 0 && (
        <ul className="px-2 pb-2 border-t border-white/[0.04]">
          {items.map((e) => {
            const f = entryFood(e);
            const open = openId === e.id;
            const kcal = Math.round(f.kcal * e.servings);
            const itemQuality = scoreNutritionQuality({
              kcal,
              protein: f.protein * e.servings,
              proteinGoal,
              meal,
              nutrients: f.nutrients
                ? {
                    fiberG:
                      f.nutrients.fiberG === undefined
                        ? undefined
                        : f.nutrients.fiberG * e.servings,
                    sugarsG:
                      f.nutrients.sugarsG === undefined
                        ? undefined
                        : f.nutrients.sugarsG * e.servings,
                    saturatedFatG:
                      f.nutrients.saturatedFatG === undefined
                        ? undefined
                        : f.nutrients.saturatedFatG * e.servings,
                    sodiumMg:
                      f.nutrients.sodiumMg === undefined
                        ? undefined
                        : f.nutrients.sodiumMg * e.servings,
                    provenance: f.nutrients.provenance,
                  }
                : undefined,
              tags: f.tags,
            });
            return (
              <li key={e.id} className="border-b border-white/[0.04] last:border-b-0">
                <button
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 text-left rounded-xl active:bg-white/[0.02] transition"
                  aria-expanded={open}
                >
                  <FoodThumbnail
                    food={{ id: e.foodId, name: f.name, brand: f.brand, imageUrl: f.imageUrl }}
                    size="lg"
                    className="size-14 rounded-2xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight">
                        {f.name}
                        {f.brand ? (
                          <span className="font-normal text-muted-foreground"> · {f.brand}</span>
                        ) : null}
                      </div>
                      <QualityDot quality={itemQuality} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 tabular-nums">
                      <span className="text-[15px] font-bold">{kcal} kcal</span>
                      <span className="text-[12px] font-medium text-muted-foreground">
                        {loggedTime(e.loggedAt)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold tabular-nums text-foreground/75">
                      <MacroLetter
                        letter="P"
                        color={MACRO_COLORS.protein}
                        value={Math.round(f.protein * e.servings)}
                      />
                      <MacroLetter
                        letter="C"
                        color={MACRO_COLORS.carbs}
                        value={Math.round(f.carbs * e.servings)}
                      />
                      <MacroLetter
                        letter="F"
                        color={MACRO_COLORS.fat}
                        value={Math.round(f.fat * e.servings)}
                      />
                      {e.servings !== 1 && <span className="text-white/40">{e.servings}×</span>}
                    </div>
                  </div>
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-200",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-2 pb-2.5 pt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.05] p-1">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onServings(e.id, e.servings - 0.5);
                          }}
                          disabled={e.servings <= 0.5}
                          className="size-7 rounded-full grid place-items-center disabled:opacity-30 active:bg-white/10"
                          aria-label="Decrease servings"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-9 text-center text-xs font-semibold tabular-nums">
                          {e.servings}×
                        </span>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onServings(e.id, e.servings + 0.5);
                          }}
                          className="size-7 rounded-full grid place-items-center active:bg-white/10"
                          aria-label="Increase servings"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setOpenId(null);
                          onEdit(e);
                        }}
                        className="ml-auto h-8 px-3 rounded-full bg-white/[0.05] border border-white/[0.05] text-[11px] font-semibold flex items-center gap-1.5 active:scale-95"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onRemove(e.id);
                        }}
                        className="h-8 px-3 rounded-full bg-destructive/15 text-destructive text-[11px] font-semibold flex items-center gap-1.5 active:scale-95"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ------------------- Add food modal -------------------

type Tab = "search" | "barcode" | "photo" | "manual";

type AddEntryArg = Omit<LogEntry, "id" | "loggedAt"> & { loggedAt?: string };

function AddFoodModal({
  meal,
  proteinGoal,
  editEntry,
  onClose,
  onAdd,
}: {
  meal: Meal;
  proteinGoal: number;
  editEntry?: LogEntry;
  onClose: () => void;
  onAdd: (entry: AddEntryArg) => void;
}) {
  // When editing, jump straight to manual prefilled from the entry
  const initialPrefill: LookupResult | null = editEntry
    ? (() => {
        const f = entryFood(editEntry);
        return {
          name: f.name,
          brand: f.brand,
          imageUrl: f.imageUrl,
          serving: f.serving,
          kcal: f.kcal,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          nutrients: f.nutrients,
        };
      })()
    : null;
  const [tab, setTab] = useState<Tab>(editEntry ? "manual" : "search");
  const [prefill, setPrefill] = useState<LookupResult | null>(initialPrefill);
  const [confirming, setConfirming] = useState<StoredFood | null>(null);

  const handleResult = (r: LookupResult, source: "barcode" | "image") => {
    setPrefill({ ...r });
    setTab("manual");
    (window as { __scanSource?: string }).__scanSource = source;
  };

  const editSource =
    editEntry?.custom?.source === "barcode" || editEntry?.custom?.source === "image"
      ? editEntry.custom.source
      : "manual";

  // Confirmation screen takes over the whole sheet when a search result is selected.
  if (confirming) {
    return (
      <Sheet onClose={onClose} title="Confirm food">
        <FoodConfirmSheet
          food={confirming}
          defaultMeal={meal}
          proteinGoal={proteinGoal}
          onBack={() => setConfirming(null)}
          onSave={(entry) => {
            onAdd(entry);
            onClose();
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} title={editEntry ? `Edit · ${meal}` : `Add to ${meal}`}>
      {!editEntry && (
        <div className="mt-1 flex gap-1 p-1 rounded-full bg-white/[0.04] border border-hairline">
          {(
            [
              { id: "search", label: "Search", Icon: Search },
              { id: "barcode", label: "Barcode", Icon: Barcode },
              { id: "photo", label: "Photo", Icon: ImageIcon },
              { id: "manual", label: "Manual", Icon: Pencil },
            ] as { id: Tab; label: string; Icon: typeof Search }[]
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 h-9 rounded-full text-[13px] font-semibold flex items-center justify-center gap-1 transition",
                tab === id ? "bg-neon text-neon-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 pb-6">
        {tab === "search" && <SearchPanel meal={meal} onPick={setConfirming} />}
        {tab === "barcode" && (
          <Suspense
            fallback={
              <div className="grid min-h-64 place-items-center rounded-3xl border border-hairline bg-white/[0.02]">
                <div className="text-center">
                  <Loader2 className="mx-auto size-6 animate-spin text-neon" />
                  <p className="mt-2 text-[13px] text-muted-foreground">Opening scanner…</p>
                </div>
              </div>
            }
          >
            <BarcodeScannerPanel onResult={(r) => handleResult(r, "barcode")} />
          </Suspense>
        )}
        {tab === "photo" && (
          <PhotoPanel
            meal={meal}
            proteinGoal={proteinGoal}
            onAdd={onAdd}
            onEditManually={(r) => handleResult(r, "image")}
            onDone={onClose}
          />
        )}
        {tab === "manual" && (
          <ManualPanel
            meal={meal}
            prefill={prefill}
            servings={editEntry?.servings ?? 1}
            source={
              editEntry
                ? editSource
                : ((window as { __scanSource?: "barcode" | "image" }).__scanSource ?? "manual")
            }
            submitLabel={editEntry ? "Save changes" : `Save to ${meal}`}
            onAdd={onAdd}
          />
        )}
      </div>
    </Sheet>
  );
}

// ============= Branded food search =============

type SearchTab = "all" | "restaurant" | "grocery" | "protein" | "recent" | "favorites";

function brandedToStored(b: BrandedFood): StoredFood {
  return {
    id: b.id,
    source: "preset",
    brand: b.brand,
    name: b.name,
    serving: b.serving,
    kcal: b.kcal,
    protein: b.protein,
    carbs: b.carbs,
    fat: b.fat,
    verified: true,
    category: b.category,
    imageUrl: getFoodImageUrl(b),
  };
}

function legacyFoodToStored(f: Food): StoredFood {
  return {
    id: `legacy:${f.id}`,
    source: "preset",
    brand: f.brand,
    name: f.name,
    serving: f.serving,
    kcal: f.kcal,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    verified: false,
    category: "generic",
    imageUrl: getFoodImageUrl({ ...f, id: `legacy:${f.id}` }),
    nutrients: f.nutrients,
  };
}

function SearchPanel({ meal, onPick }: { meal: Meal; onPick: (food: StoredFood) => void }) {
  void meal;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<SearchTab>("all");
  const [serverResults, setServerResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState(false);
  const search = useServerFn(searchFoodDatabase);
  const recents = useRecentFoods();
  const favorites = useFavoriteFoods();

  // Debounced server search
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setServerResults([]);
      setServerErr(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setServerErr(false);
      try {
        const r = await search({ data: { query: trimmed } });
        if (cancelled) return;
        if (r.ok) setServerResults(r.results);
        else {
          setServerResults([]);
          setServerErr(true);
        }
      } catch (e) {
        console.error("[searchFoodDatabase]", e);
        if (!cancelled) {
          setServerResults([]);
          setServerErr(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, search]);

  // Local preset matches (instant)
  const presetMatches = useMemo(() => searchBrandedPresets(q), [q]);

  // Combined results: presets first (verified, curated), then API results
  const combined: StoredFood[] = useMemo(() => {
    const seen = new Set<string>();
    const acc: StoredFood[] = [];
    const push = (s: StoredFood) => {
      const key = `${(s.brand ?? "").toLowerCase()}|${s.name.toLowerCase().slice(0, 40)}`;
      if (seen.has(key)) return;
      seen.add(key);
      acc.push(s);
    };
    presetMatches.forEach((b) => push(brandedToStored(b)));
    serverResults.forEach((r) => push(resultToStored(r)));
    if (!q.trim()) {
      // when no query, surface a default sampler of curated presets
      brandedFoods.slice(0, 20).forEach((b) => push(brandedToStored(b)));
      // include legacy generic foods so existing users see familiar items
      foods.forEach((f) => push(legacyFoodToStored(f)));
    } else {
      // also surface generic legacy matches in case API/presets miss them
      foods
        .filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
        .forEach((f) => push(legacyFoodToStored(f)));
    }
    return acc;
  }, [presetMatches, serverResults, q]);

  // Filtered by tab
  const visible: StoredFood[] = useMemo(() => {
    if (tab === "recent") return recents;
    if (tab === "favorites") return favorites;
    if (tab === "all") return combined;
    return combined.filter((s) => s.category === tab);
  }, [tab, combined, recents, favorites]);

  return (
    <>
      <label className="flex items-center gap-3 h-12 rounded-2xl bg-white/[0.04] border border-hairline px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search foods, brands, restaurants…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
        />
        {loading && <Loader2 className="size-4 text-muted-foreground animate-spin" />}
        {q && !loading && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear"
            className="size-6 grid place-items-center rounded-full hover:bg-white/[0.06]"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </label>

      {/* Category tabs */}
      <div className="mt-3 -mx-1 px-1 flex gap-1.5 overflow-x-auto scrollbar-none">
        {(
          [
            { id: "all", label: "All", Icon: Utensils },
            { id: "restaurant", label: "Restaurants", Icon: Utensils },
            { id: "grocery", label: "Grocery", Icon: Utensils },
            { id: "protein", label: "Protein", Icon: Utensils },
            { id: "recent", label: "Recent", Icon: History },
            { id: "favorites", label: "Favorites", Icon: Heart },
          ] as { id: SearchTab; label: string; Icon: typeof Search }[]
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 h-8 px-3 rounded-full text-[13px] font-semibold flex items-center gap-1 transition border",
              tab === id
                ? "bg-neon text-neon-foreground border-transparent"
                : "bg-white/[0.04] text-muted-foreground border-hairline",
            )}
          >
            <Icon className="size-3" /> {label}
            {id === "recent" && recents.length > 0 && (
              <span className="ml-0.5 opacity-70 tabular-nums">{recents.length}</span>
            )}
            {id === "favorites" && favorites.length > 0 && (
              <span className="ml-0.5 opacity-70 tabular-nums">{favorites.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Popular brands carousel (only when no query and on "all" / category tabs) */}
      {!q && tab !== "recent" && tab !== "favorites" && (
        <>
          <h3 className="mt-5 mb-2 text-[12px] uppercase tracking-wider text-muted-foreground">
            Popular brands
          </h3>
          <div className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {popularBrands
              .filter((b) => tab === "all" || b.category === tab)
              .map((b) => (
                <button
                  key={b.name}
                  onClick={() => setQ(b.name)}
                  className="shrink-0 h-10 px-3 rounded-full bg-white/[0.04] border border-hairline text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <BrandLogo brand={b.name} />
                  <span className="font-medium">{b.name}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {/* Server error notice (graceful — local presets still work) */}
      {serverErr && q.trim().length >= 2 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-[13px] text-amber-200">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span>Branded database is unavailable right now — showing curated matches only.</span>
        </div>
      )}

      <h3 className="mt-5 mb-2 text-[12px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>
          {tab === "recent"
            ? "Recently logged"
            : tab === "favorites"
              ? "Saved favorites"
              : q
                ? "Results"
                : "Suggested"}
        </span>
        {visible.length > 0 && (
          <span className="normal-case tracking-normal text-[12px] text-muted-foreground/70">
            {visible.length} items
          </span>
        )}
      </h3>

      <ul className="space-y-2">
        {visible.map((s) => (
          <li key={s.id}>
            <FoodResultRow food={s} onPick={() => onPick(s)} />
          </li>
        ))}
        {visible.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">
            {tab === "recent"
              ? "No recent foods yet — start logging!"
              : tab === "favorites"
                ? "Tap the star on a food to save it here."
                : loading
                  ? "Searching…"
                  : q
                    ? "No matches. Try a different search or add manually."
                    : "No items."}
          </p>
        )}
      </ul>
    </>
  );
}

function FoodResultRow({ food, onPick }: { food: StoredFood; onPick: () => void }) {
  const [fav, setFav] = useState(() => isFavorite(food.id));
  const macroLine = `P${Math.round(food.protein)} · C${Math.round(food.carbs)} · F${Math.round(food.fat)}`;
  return (
    <div className="relative w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-hairline">
      <button
        onClick={onPick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.99]"
      >
        <FoodThumbnail food={food} size="md" className="!size-10 !rounded-xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <BrandLogo brand={food.brand} className="size-4 p-0.5" />
            {food.brand && (
              <span className="text-[12px] font-bold uppercase tracking-wider text-neon truncate max-w-[40%]">
                {food.brand}
              </span>
            )}
            {food.verified && <BadgeCheck className="size-3 text-neon shrink-0" />}
          </div>
          <div className="font-medium text-sm truncate">{food.name}</div>
          <div className="text-[13px] text-muted-foreground truncate">
            {food.serving} · {macroLine}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-neon tabular-nums text-sm">{Math.round(food.kcal)}</div>
          <div className="text-[12px] text-muted-foreground">kcal</div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setFav(toggleFavorite(food));
        }}
        aria-label={fav ? "Unfavorite" : "Favorite"}
        className="size-8 grid place-items-center rounded-full hover:bg-white/[0.06] shrink-0"
      >
        <Star className={cn("size-4", fav ? "fill-neon text-neon" : "text-muted-foreground")} />
      </button>
    </div>
  );
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const PHOTO_SCAN_ERRORS: Record<string, string> = {
  no_key: "AI is not configured yet. Please add foods manually.",
  no_food: "We couldn't find food or a drink in that photo. Try a closer, well-lit shot.",
  rate_limited: "You've scanned a lot of photos this hour. Try again later or add food manually.",
  unrecognized: "Couldn't detect this meal clearly. Try another photo or add food manually.",
  error: "The photo scan couldn't be completed. Check your connection and try again.",
};

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function PhotoPanel({
  meal,
  proteinGoal,
  onAdd,
  onEditManually,
  onDone,
}: {
  meal: Meal;
  proteinGoal: number;
  onAdd: (e: Omit<LogEntry, "id" | "loggedAt">) => void;
  onEditManually: (r: LookupResult) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const analyzeFn = useServerFn(analyzeFoodImage);

  const reset = () => {
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
  };

  const pick = (f: File) => {
    if (f.size > MAX_IMAGE_BYTES) {
      setError("Image is too large (max 8 MB). Try a smaller photo.");
      return;
    }
    setError("");
    setResult(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // Snap and go: scanning starts immediately instead of asking for a second tap.
    void runAnalyze(f);
  };

  const runAnalyze = async (target?: File) => {
    const source = target ?? file;
    if (!source) return;
    setLoading(true);
    setError("");
    try {
      // Phone photos are several megabytes; a resized JPEG uploads quickly and
      // stays inside request limits while keeping package text legible.
      const compressed = await compressImage(source, 1600, 0.85).catch(() => source);
      const dataUrl = await fileToDataUrl(
        new File([compressed], "meal.jpg", { type: compressed.type || source.type }),
      );
      const resp = await analyzeFn({ data: { image: dataUrl } });
      if (resp.ok) {
        setResult(resp.result);
      } else {
        setError(PHOTO_SCAN_ERRORS[resp.reason] ?? PHOTO_SCAN_ERRORS.error);
      }
    } catch (e) {
      console.error(e);
      setError(PHOTO_SCAN_ERRORS.error);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Confirmation screen ----------
  if (result) {
    return (
      <PhotoConfirm
        meal={meal}
        proteinGoal={proteinGoal}
        preview={preview}
        result={result}
        onReanalyze={runAnalyze}
        onEditManually={() => {
          // Collapse all items into a single combined prefill for ManualPanel
          const t = result.total;
          onEditManually({
            name: result.meal_name,
            serving: result.items
              .map((i) => `${i.name} ${i.estimated_amount}`)
              .join(", ")
              .slice(0, 60),
            kcal: t.calories,
            protein: t.protein,
            carbs: t.carbs,
            fat: t.fat,
            confidence: result.confidence,
            nutrients: {
              fiberG: result.items.reduce((sum, item) => sum + item.fiber, 0),
              sugarsG: result.items.reduce((sum, item) => sum + item.sugars, 0),
              saturatedFatG: result.items.reduce((sum, item) => sum + item.saturated_fat, 0),
              sodiumMg: result.items.reduce((sum, item) => sum + item.sodium, 0),
              provenance: "estimated",
            },
          });
        }}
        onSave={(items) => {
          for (const it of items) {
            onAdd({
              meal,
              servings: 1,
              custom: {
                name: it.name,
                serving: it.estimated_amount || "1 serving",
                kcal: it.calories,
                protein: it.protein,
                carbs: it.carbs,
                fat: it.fat,
                source: "image",
                nutrients: {
                  fiberG: it.fiber,
                  sugarsG: it.sugars,
                  saturatedFatG: it.saturated_fat,
                  sodiumMg: it.sodium,
                  provenance: "estimated",
                },
              },
            });
          }
          onDone();
        }}
      />
    );
  }

  // ---------- Pick / preview screen ----------
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
      />

      {!preview ? (
        <FoodCameraPanel onFile={pick} onGalleryClick={() => inputRef.current?.click()} />
      ) : (
        <div className="aspect-[3/4] rounded-[24px] overflow-hidden relative border border-hairline">
          <img src={preview} alt="meal" className="size-full object-cover" />
          <button
            onClick={reset}
            className="absolute top-3 right-3 size-9 rounded-full bg-black/60 grid place-items-center"
            aria-label="Remove"
          >
            <X className="size-4" />
          </button>
          {loading && (
            <div className="absolute inset-0 bg-black/70 grid place-items-center">
              <div className="text-center">
                <Loader2 className="size-7 text-neon mx-auto animate-spin" />
                <p className="mt-2 text-xs text-neon font-medium">Analyzing your meal…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-[12px] text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <div className="mt-3 flex gap-2">
            {preview && (
              <button
                onClick={() => void runAnalyze()}
                className="flex-1 h-10 rounded-full bg-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="size-3.5" /> Try again
              </button>
            )}
            <button
              onClick={() =>
                onEditManually({
                  name: "",
                  serving: "1 serving",
                  kcal: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                })
              }
              className="flex-1 h-10 rounded-full bg-neon text-neon-foreground text-xs font-semibold"
            >
              Add manually
            </button>
          </div>
        </div>
      )}

      {preview && !loading && !error && (
        <button
          onClick={reset}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-hairline bg-white/[0.04] text-sm font-semibold active:scale-[0.98]"
        >
          <RotateCcw className="size-4" /> Retake photo
        </button>
      )}
      <p className="mt-3 text-[12px] text-muted-foreground text-center">
        AI estimates — confirm before saving.
      </p>
    </div>
  );
}

function PhotoConfirm({
  meal,
  proteinGoal,
  preview,
  result,
  onSave,
  onReanalyze,
  onEditManually,
}: {
  meal: Meal;
  proteinGoal: number;
  preview: string;
  result: FoodScanResult;
  onSave: (items: FoodScanItem[]) => void;
  onReanalyze: () => void;
  onEditManually: () => void;
}) {
  const [items, setItems] = useState<FoodScanItem[]>(result.items);

  const updateItem = (idx: number, patch: Partial<FoodScanItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        name: "",
        estimated_amount: "1 serving",
        packaged: false,
        confidence: 1,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugars: 0,
        saturated_fat: 0,
        sodium: 0,
      },
    ]);

  const total = items.reduce(
    (a, i) => ({
      calories: a.calories + (Number(i.calories) || 0),
      protein: a.protein + (Number(i.protein) || 0),
      carbs: a.carbs + (Number(i.carbs) || 0),
      fat: a.fat + (Number(i.fat) || 0),
      fiber: a.fiber + (Number(i.fiber) || 0),
      sugars: a.sugars + (Number(i.sugars) || 0),
      saturatedFat: a.saturatedFat + (Number(i.saturated_fat) || 0),
      sodium: a.sodium + (Number(i.sodium) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugars: 0, saturatedFat: 0, sodium: 0 },
  );
  const quality = scoreNutritionQuality({
    kcal: total.calories,
    protein: total.protein,
    proteinGoal,
    meal,
    nutrients: {
      fiberG: total.fiber,
      sugarsG: total.sugars,
      saturatedFatG: total.saturatedFat,
      sodiumMg: total.sodium,
      provenance: "estimated",
    },
  });

  const lowConfidence = result.needs_user_confirmation || result.confidence < 0.7;
  const confColor =
    result.confidence >= 0.85
      ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/30"
      : result.confidence >= 0.7
        ? "bg-neon/15 text-neon border-neon/30"
        : "bg-amber-400/15 text-amber-300 border-amber-400/30";

  const canSave = items.length > 0 && items.every((i) => i.name.trim().length > 0);

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative overflow-hidden rounded-[24px] border border-hairline">
          <img src={preview} alt="meal" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
            {items.slice(0, 4).map((it, idx) => (
              <span
                key={idx}
                className="rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[12px] font-semibold backdrop-blur"
              >
                {it.name.trim() || "Item"}
              </span>
            ))}
            {items.length > 4 && (
              <span className="rounded-full border border-white/15 bg-black/60 px-2 py-1 text-[12px] font-semibold backdrop-blur">
                +{items.length - 4}
              </span>
            )}
          </div>
          <div className="absolute inset-x-3 bottom-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neon">
              Confirm your meal
            </p>
            <h3 className="mt-0.5 truncate text-lg font-bold">{result.meal_name}</h3>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold",
                confColor,
              )}
            >
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-[12px] uppercase tracking-wider text-muted-foreground">
            Confirm your meal
          </p>
          <h3 className="truncate text-base font-bold">{result.meal_name}</h3>
        </div>
      )}

      {lowConfidence && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-[13px] text-amber-200">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span>We're not fully sure. Please confirm the foods and portions below.</span>
        </div>
      )}

      {items.some((item) => item.packaged) && (
        <div className="flex items-start gap-2 rounded-2xl border border-hairline bg-white/[0.03] p-3 text-[13px] text-muted-foreground">
          <ScanLine className="size-3.5 shrink-0 mt-0.5 text-neon" />
          <span>
            Packaged product detected. For the exact values on your package, use Barcode or scan the
            Nutrition Facts label from Manual.
          </span>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-hairline bg-white/[0.02] p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <input
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                placeholder="Food name"
                className="flex-1 h-9 rounded-lg bg-white/[0.04] border border-hairline px-2.5 text-sm outline-none focus:border-neon/40"
                maxLength={60}
              />
              <button
                onClick={() => removeItem(idx)}
                className="size-9 rounded-lg bg-white/[0.04] grid place-items-center text-muted-foreground"
                aria-label="Remove item"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={it.estimated_amount}
                onChange={(e) => updateItem(idx, { estimated_amount: e.target.value })}
                placeholder="Portion (e.g. 150g)"
                className="flex-1 h-9 rounded-lg bg-white/[0.04] border border-hairline px-2.5 text-xs outline-none focus:border-neon/40"
                maxLength={30}
              />
              {it.confidence < 0.7 && (
                <span className="text-[12px] text-amber-300 font-medium whitespace-nowrap">
                  {Math.round(it.confidence * 100)}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                <MacroInput
                  // Remount when rows are added or removed so each field shows its own item.
                  key={`${items.length}-${idx}-${k}`}
                  label={k === "calories" ? "kcal" : `${k.slice(0, 1).toUpperCase()}(g)`}
                  value={it[k] ?? 0}
                  decimals={k !== "calories"}
                  onChange={(value) => updateItem(idx, { [k]: value } as Partial<FoodScanItem>)}
                />
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Fibre {Math.round(it.fiber * 10) / 10}g · Sugars {Math.round(it.sugars * 10) / 10}g ·
              Sat. fat {Math.round(it.saturated_fat * 10) / 10}g · Sodium {Math.round(it.sodium)}mg
            </p>
          </div>
        ))}

        <button
          onClick={addItem}
          className="w-full h-10 rounded-2xl border border-dashed border-white/15 text-[13px] text-muted-foreground flex items-center justify-center gap-1.5"
        >
          <Plus className="size-3.5" /> Add another item
        </button>
      </div>

      <div className="rounded-[20px] border border-analytics-teal/20 bg-analytics-teal/[0.07] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="data-kicker text-analytics-teal">Estimated fuel quality</p>
            <p className="mt-1 text-sm font-bold">{quality.band}</p>
          </div>
          <strong className="text-2xl font-bold text-analytics-teal tabular-nums">
            {quality.score ?? "—"}
          </strong>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <QualitySignal
            label="Positive"
            value={quality.positives[0] ?? "Nutrition details detected"}
            positive
          />
          <QualitySignal
            label="Watch"
            value={quality.watchItems[0] ?? "No major watch item detected"}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Based on the ingredients and portions above · {Math.round(result.confidence * 100)}% image
          confidence. Confirm before logging.
        </p>
      </div>

      <div className="rounded-2xl bg-white/[0.035] border border-hairline p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-wider text-neon">Total</span>
          <span className="text-base font-bold tabular-nums">{total.calories} kcal</span>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2 text-[13px] text-muted-foreground">
          <span>
            P <span className="text-foreground font-semibold tabular-nums">{total.protein}g</span>
          </span>
          <span>
            C <span className="text-foreground font-semibold tabular-nums">{total.carbs}g</span>
          </span>
          <span>
            F <span className="text-foreground font-semibold tabular-nums">{total.fat}g</span>
          </span>
        </div>
      </div>

      <button
        onClick={() => onSave(items)}
        disabled={!canSave}
        className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        <Check className="size-4" /> Save meal to {meal}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onReanalyze}
          className="h-10 rounded-full bg-white/[0.05] text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="size-3.5" /> Re-analyze
        </button>
        <button
          onClick={onEditManually}
          className="h-10 rounded-full bg-white/[0.05] text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Pencil className="size-3.5" /> Edit manually
        </button>
      </div>
    </div>
  );
}

function MacroInput({
  label,
  value,
  decimals,
  onChange,
}: {
  label: string;
  value: number;
  decimals: boolean;
  onChange: (value: number) => void;
}) {
  // Keeps the typed text (e.g. "3.") while the parent stores the number.
  const [text, setText] = useState(String(value));
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        inputMode={decimals ? "decimal" : "numeric"}
        value={text}
        onChange={(e) => {
          const next = decimals
            ? decimalInput(e.target.value)
            : e.target.value.replace(/[^0-9]/g, "");
          setText(next);
          onChange(Number(next) || 0);
        }}
        className="mt-0.5 h-9 w-full rounded-lg bg-white/[0.04] border border-hairline px-2 text-xs outline-none focus:border-neon/40 tabular-nums"
      />
    </label>
  );
}

function formatGrams(value: number) {
  return String(Math.round(value * 10) / 10);
}

// Keeps digits and one decimal point so label values like 3.5 g can be entered.
function decimalInput(value: string) {
  const [whole, ...decimals] = value.replace(/[^0-9.]/g, "").split(".");
  return decimals.length ? `${whole}.${decimals.join("")}` : whole;
}

const LABEL_UNREADABLE_MESSAGE =
  "We couldn't read that label. Take a close, well-lit photo of the Nutrition Facts table.";

function ManualPanel({
  meal,
  prefill,
  servings = 1,
  source,
  submitLabel,
  onAdd,
}: {
  meal: Meal;
  prefill: LookupResult | null;
  servings?: number;
  source: "manual" | "barcode" | "image";
  submitLabel?: string;
  onAdd: (e: Omit<LogEntry, "id" | "loggedAt">) => void;
}) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [brand, setBrand] = useState(prefill?.brand ?? "");
  const [serving, setServing] = useState(prefill?.serving ?? "1 serving");
  const [kcal, setKcal] = useState<string>(
    prefill?.kcal != null ? String(Math.round(prefill.kcal)) : "",
  );
  const [protein, setProtein] = useState<string>(
    prefill?.protein != null ? formatGrams(prefill.protein) : "",
  );
  const [carbs, setCarbs] = useState<string>(
    prefill?.carbs != null ? formatGrams(prefill.carbs) : "",
  );
  const [fat, setFat] = useState<string>(prefill?.fat != null ? formatGrams(prefill.fat) : "");
  const [labelNutrients, setLabelNutrients] = useState<NutrientDetails | undefined>();
  const [labelStatus, setLabelStatus] = useState<"idle" | "reading" | "read" | "error">("idle");
  const [labelMessage, setLabelMessage] = useState("");
  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const readLabel = useServerFn(readNutritionLabel);

  const canSave = name.trim().length > 0 && Number(kcal) >= 0;
  const labelCheckSuggested =
    source === "barcode" && Boolean(prefill?.needsLabelCheck) && labelStatus !== "read";

  const submit = () => {
    if (!canSave) return;
    onAdd({
      meal,
      servings,
      custom: {
        name: name.trim(),
        brand: brand.trim() || undefined,
        imageUrl: prefill?.imageUrl,
        serving: serving.trim() || "1 serving",
        kcal: Number(kcal) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        source,
        nutrients: labelNutrients ?? prefill?.nutrients,
      },
    });
  };

  const scanLabel = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setLabelStatus("error");
      setLabelMessage("That photo is too large (max 8 MB). Try a smaller one.");
      return;
    }
    setLabelStatus("reading");
    setLabelMessage("");
    try {
      const compressed = await compressImage(file, 1600, 0.85).catch(() => file);
      const image = await fileToDataUrl(
        new File([compressed], "nutrition-label.jpg", { type: compressed.type || file.type }),
      );
      const response = await readLabel({ data: { image } });
      if (!response.ok) {
        setLabelStatus("error");
        setLabelMessage(
          response.reason === "rate_limited"
            ? "You've scanned a lot of labels this hour. Try again later or enter the values."
            : LABEL_UNREADABLE_MESSAGE,
        );
        return;
      }

      const label = response.result;
      if (label.productName && !name.trim()) setName(label.productName.slice(0, 60));
      setServing(label.serving.slice(0, 30));
      setKcal(String(label.kcal));
      if (label.protein !== undefined) setProtein(formatGrams(label.protein));
      if (label.carbs !== undefined) setCarbs(formatGrams(label.carbs));
      if (label.fat !== undefined) setFat(formatGrams(label.fat));
      setLabelNutrients(label.nutrients);
      setLabelStatus("read");
      setLabelMessage(
        label.consistent
          ? "Filled in from your nutrition label. Check the food name, then save."
          : "Filled in from your label, but the calories don't add up with the macros. Double-check them before saving.",
      );
    } catch (error) {
      console.error("[nutrition label]", error);
      setLabelStatus("error");
      setLabelMessage(LABEL_UNREADABLE_MESSAGE);
    } finally {
      if (labelInputRef.current) labelInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {prefill && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon/10 border border-neon/20 text-[13px] text-neon">
          {prefill.imageUrl ? (
            <FoodThumbnail
              food={{
                name: prefill.name,
                brand: prefill.brand,
                imageUrl: prefill.imageUrl,
              }}
              size="sm"
            />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          <span>
            {labelStatus === "read"
              ? "Checked against your nutrition label"
              : source === "barcode"
                ? "Detected from barcode"
                : "AI-estimated from photo"}
            {prefill.confidence && labelStatus !== "read"
              ? ` · ${Math.round(prefill.confidence * 100)}% confidence`
              : ""}
          </span>
        </div>
      )}

      {source !== "image" && (
        <div
          className={cn(
            "rounded-2xl border px-3 py-3",
            labelCheckSuggested
              ? "border-amber-400/25 bg-amber-400/[0.06]"
              : "border-hairline bg-white/[0.03]",
          )}
        >
          <input
            ref={labelInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void scanLabel(e.target.files?.[0])}
          />
          <p
            className={cn(
              "flex items-start gap-2 text-[13px] leading-relaxed",
              labelStatus === "error"
                ? "text-destructive"
                : labelCheckSuggested
                  ? "text-amber-100/90"
                  : "text-muted-foreground",
            )}
          >
            {labelCheckSuggested && (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
            )}
            <span>
              {labelMessage ||
                (labelCheckSuggested
                  ? "This product's database entry looks inconsistent. Scan the Nutrition Facts label to use the exact values."
                  : source === "barcode"
                    ? "Barcode data comes from a community database. Scan the Nutrition Facts label to match your package exactly."
                    : "Have the package? Scan its Nutrition Facts label to fill this in.")}
            </span>
          </p>
          <button
            type="button"
            onClick={() => labelInputRef.current?.click()}
            disabled={labelStatus === "reading"}
            className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-neon/30 bg-neon/10 text-xs font-semibold text-neon disabled:opacity-50 active:scale-[0.98]"
          >
            {labelStatus === "reading" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ScanLine className="size-3.5" />
            )}
            {labelStatus === "reading"
              ? "Reading label…"
              : labelStatus === "read"
                ? "Scan label again"
                : "Scan nutrition label"}
          </button>
        </div>
      )}

      <Field label="Food name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chicken rice bowl"
          className={inp}
          maxLength={60}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand (optional)">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={inp}
            maxLength={40}
          />
        </Field>
        <Field label="Serving size">
          <input
            value={serving}
            onChange={(e) => setServing(e.target.value)}
            placeholder="1 cup, 100g…"
            className={inp}
            maxLength={30}
          />
        </Field>
      </div>
      <Field label="Calories (kcal)">
        <input
          inputMode="numeric"
          value={kcal}
          onChange={(e) => setKcal(e.target.value.replace(/[^0-9]/g, ""))}
          className={inp}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Protein (g)">
          <input
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(decimalInput(e.target.value))}
            className={inp}
          />
        </Field>
        <Field label="Carbs (g)">
          <input
            inputMode="decimal"
            value={carbs}
            onChange={(e) => setCarbs(decimalInput(e.target.value))}
            className={inp}
          />
        </Field>
        <Field label="Fat (g)">
          <input
            inputMode="decimal"
            value={fat}
            onChange={(e) => setFat(decimalInput(e.target.value))}
            className={inp}
          />
        </Field>
      </div>

      <button
        onClick={submit}
        disabled={!canSave}
        className="mt-2 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        <Check className="size-4" /> {submitLabel ?? `Save to ${meal}`}
      </button>
    </div>
  );
}

const inp =
  "h-11 w-full rounded-xl bg-white/[0.04] border border-hairline px-3 text-sm outline-none focus:border-neon/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const TARGET_REFRESH_DISMISSED_KEY = "fitness:target-refresh-dismissed";

/**
 * Offers the current recommendation when the saved targets have drifted from it,
 * e.g. targets set before a formula fix or before the member changed their goal.
 * "Keep mine" hides it until the recommendation itself changes.
 */
function TargetRefreshCard({ goals, profile }: { goals: NutritionGoals; profile: Profile }) {
  const recommended = useMemo(() => suggestNutrition(profile), [profile]);
  const signature = `${recommended.kcal}-${recommended.protein}-${recommended.carbs}-${recommended.fat}`;
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TARGET_REFRESH_DISMISSED_KEY);
    } catch {
      return null;
    }
  });
  const drifted =
    Math.abs(recommended.kcal - goals.kcal) >= 150 ||
    Math.abs(recommended.protein - goals.protein) >= 15;
  if (!drifted || dismissed === signature) return null;

  const keepMine = () => {
    setDismissed(signature);
    try {
      localStorage.setItem(TARGET_REFRESH_DISMISSED_KEY, signature);
    } catch {
      /* the card simply shows again next visit */
    }
  };

  return (
    <section className="mt-3 rounded-[18px] border border-hairline bg-surface px-4 py-3.5">
      <p className="text-[14px] font-semibold">Updated targets for your goal</p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        Based on your profile: {recommended.kcal.toLocaleString()} kcal · {recommended.protein}g
        protein · {recommended.carbs}g carbs · {recommended.fat}g fat. You're on{" "}
        {goals.kcal.toLocaleString()} kcal now.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setNutritionGoals(recommended);
            toast.success("Targets updated");
          }}
          className="h-9 rounded-full bg-neon px-4 text-[13px] font-semibold text-neon-foreground active:scale-95"
        >
          Use these
        </button>
        <button
          type="button"
          onClick={keepMine}
          className="h-9 rounded-full border border-hairline px-4 text-[13px] font-semibold text-muted-foreground active:scale-95"
        >
          Keep mine
        </button>
      </div>
    </section>
  );
}

function Sheet({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  // ensure resultToCustom isn't tree-shaken (used elsewhere via panels)
  void resultToCustom;
  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade_0.2s_ease-out]"
        />
        <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-hairline bg-[oklch(0.16_0_0)] page-pb-safe animate-[slideup_0.25s_ease-out]">
          <div className="sticky top-0 bg-[oklch(0.16_0_0)]/95 backdrop-blur z-10 px-5 pt-3 pb-3 flex items-center justify-between border-b border-hairline">
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-1 w-10 rounded-full bg-white/15" />
            <h2 className="font-bold text-base mt-2">{title}</h2>
            <button
              onClick={onClose}
              className="size-9 rounded-full bg-white/[0.05] grid place-items-center mt-1"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="px-5">{children}</div>
        </div>
        <style>{`
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideup { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      </div>
    </BodyPortal>
  );
}

// ============= Food confirmation sheet (full screen) =============

function toLocalDatetimeValue(iso: string): string {
  // Convert ISO -> "YYYY-MM-DDTHH:mm" in local time for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeValue(v: string): string {
  // Parses as local time -> ISO. Empty falls back to now.
  return v ? new Date(v).toISOString() : new Date().toISOString();
}

function FoodConfirmSheet({
  food,
  defaultMeal,
  proteinGoal,
  onBack,
  onSave,
}: {
  food: StoredFood;
  defaultMeal: Meal;
  proteinGoal: number;
  onBack: () => void;
  onSave: (entry: AddEntryArg) => void;
}) {
  const [servings, setServings] = useState(1);
  const [serving, setServing] = useState(food.serving);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [when, setWhen] = useState(() => toLocalDatetimeValue(new Date().toISOString()));

  const totals = {
    kcal: Math.round(food.kcal * servings),
    protein: Math.round(food.protein * servings * 10) / 10,
    carbs: Math.round(food.carbs * servings * 10) / 10,
    fat: Math.round(food.fat * servings * 10) / 10,
  };
  const quality = scoreNutritionQuality({
    kcal: totals.kcal,
    protein: totals.protein,
    proteinGoal,
    meal,
    nutrients: food.nutrients
      ? {
          fiberG:
            food.nutrients.fiberG === undefined ? undefined : food.nutrients.fiberG * servings,
          sugarsG:
            food.nutrients.sugarsG === undefined ? undefined : food.nutrients.sugarsG * servings,
          saturatedFatG:
            food.nutrients.saturatedFatG === undefined
              ? undefined
              : food.nutrients.saturatedFatG * servings,
          sodiumMg:
            food.nutrients.sodiumMg === undefined ? undefined : food.nutrients.sodiumMg * servings,
          provenance: food.nutrients.provenance,
        }
      : undefined,
  });

  const bumpServings = (delta: number) =>
    setServings((s) => Math.max(0.25, Math.round((s + delta) * 4) / 4));

  const submit = () => {
    const loggedAt = fromLocalDatetimeValue(when);
    // Legacy preset (from the original src/lib/foods.ts) → store as foodId reference
    if (food.id.startsWith("legacy:")) {
      const foodId = food.id.slice("legacy:".length);
      onSave({ meal, servings, foodId, loggedAt });
      pushRecent({
        ...food,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });
      return;
    }
    // Everything else (curated preset, Nutritionix, USDA, OpenFoodFacts) → store as inline custom
    onSave({
      meal,
      servings,
      loggedAt,
      custom: {
        name: food.name,
        brand: food.brand,
        imageUrl: food.imageUrl ?? getFoodImageUrl(food),
        serving: serving.trim() || food.serving,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: "preset",
        nutrients: food.nutrients,
      },
    });
    pushRecent(food);
  };

  return (
    <div className="pb-6">
      <button
        onClick={onBack}
        className="mt-2 -ml-1 flex items-center gap-1 text-xs text-muted-foreground active:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to search
      </button>

      {/* Food header card */}
      <div className="mt-3 p-4 rounded-2xl bg-white/[0.04] border border-hairline">
        <div className="flex items-start gap-3">
          <FoodThumbnail food={food} size="lg" />
          <div className="flex-1 min-w-0">
            {food.brand && (
              <div className="flex items-center gap-1.5">
                <BrandLogo brand={food.brand} className="size-4 p-0.5" />
                <span className="text-[12px] font-bold uppercase tracking-wider text-neon truncate">
                  {food.brand}
                </span>
                {food.verified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-neon/15 border border-neon/30 text-[11px] font-bold text-neon">
                    <BadgeCheck className="size-2.5" /> VERIFIED
                  </span>
                )}
              </div>
            )}
            <h3 className="font-bold text-base leading-tight mt-0.5">{food.name}</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5 capitalize">
              Source:{" "}
              {food.source === "preset"
                ? "curated database"
                : food.source === "nutritionix"
                  ? "Nutritionix"
                  : food.source === "usda"
                    ? "USDA FoodData Central"
                    : food.source === "openfoodfacts"
                      ? "Open Food Facts"
                      : "custom"}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            { label: "kcal", value: totals.kcal },
            { label: "P", value: totals.protein },
            { label: "C", value: totals.carbs },
            { label: "F", value: totals.fat },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl bg-white/[0.03] border border-hairline px-2 py-2"
            >
              <div className="text-base font-bold tabular-nums">{m.value}</div>
              <div className="text-[12px] uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-[20px] border border-hairline bg-black/20 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="data-kicker text-analytics-teal">Fuel quality</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {quality.confidence === "partial"
                ? "Partial score—missing nutrients stay excluded"
                : `${quality.confidence} nutrition details`}
            </p>
          </div>
          <QualityBadge quality={quality} />
        </div>
        {(quality.positives[0] || quality.watchItems[0]) && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <QualitySignal
              label="Positive"
              value={quality.positives[0] ?? "More nutrition data needed"}
              positive
            />
            <QualitySignal
              label="Watch"
              value={quality.watchItems[0] ?? "No major watch item detected"}
            />
          </div>
        )}
      </div>

      {/* Quantity stepper */}
      <Field label={`Quantity (× ${food.serving})`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => bumpServings(-0.25)}
            disabled={servings <= 0.25}
            className="size-11 rounded-xl bg-white/[0.05] border border-hairline grid place-items-center disabled:opacity-40"
            aria-label="Decrease"
          >
            <Minus className="size-4" />
          </button>
          <input
            inputMode="decimal"
            value={servings}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v > 0) setServings(Math.round(v * 4) / 4);
              else if (e.target.value === "") setServings(0.25);
            }}
            className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-hairline px-3 text-center text-base font-semibold tabular-nums outline-none focus:border-neon/40"
          />
          <button
            onClick={() => bumpServings(0.25)}
            className="size-11 rounded-xl bg-white/[0.05] border border-hairline grid place-items-center"
            aria-label="Increase"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {[0.5, 1, 1.5, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setServings(n)}
              className={cn(
                "flex-1 h-8 rounded-full text-[13px] font-semibold border",
                servings === n
                  ? "bg-neon text-neon-foreground border-transparent"
                  : "bg-white/[0.04] border-hairline text-muted-foreground",
              )}
            >
              ×{n}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Serving size">
        <input
          value={serving}
          onChange={(e) => setServing(e.target.value)}
          className={inp}
          maxLength={40}
        />
      </Field>

      <Field label="Meal">
        <div className="grid grid-cols-4 gap-1.5">
          {meals.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={cn(
                "h-10 rounded-xl text-[13px] font-semibold border",
                meal === m
                  ? "bg-neon text-neon-foreground border-transparent"
                  : "bg-white/[0.04] border-hairline text-muted-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Date & time">
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className={inp}
        />
      </Field>

      <button
        onClick={submit}
        className="mt-4 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon active:scale-[0.98]"
      >
        <Check className="size-4" /> Save to {meal}
      </button>
    </div>
  );
}
