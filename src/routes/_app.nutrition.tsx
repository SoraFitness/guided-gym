import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, Search, Plus, X, ScanLine, Sparkles, Trash2, Check, ChevronLeft, ChevronRight,
  Barcode, Image as ImageIcon, Pencil, Flame, Loader2, Upload, Minus,
  Star, ArrowLeft, BadgeCheck, History, Heart, Utensils,
} from "lucide-react";
import {
  foods, meals, entriesOn, macrosFor, entryFood,
  type Meal, type LogEntry, type Food,
} from "@/lib/foods";
import {
  useNutrition, addEntry as storeAdd, updateEntry as storeUpdate, removeEntry as storeRemove,
} from "@/lib/nutritionStore";
import { FoodThumbnail, MealThumbnail } from "@/components/FoodThumbnail";
import { foodLookupService, resultToCustom, type LookupResult } from "@/lib/foodLookup";
import { analyzeFoodImage, type FoodScanItem, type FoodScanResult } from "@/lib/foodScan.functions";
import { searchFoodDatabase, type FoodSearchResult } from "@/lib/foodSearch.functions";
import {
  brandedFoods, popularBrands, searchBrandedPresets, findPresetById,
  type BrandedFood, type BrandCategory,
} from "@/lib/brandedFoods";
import {
  useRecentFoods, useFavoriteFoods, pushRecent, toggleFavorite, isFavorite, resultToStored,
  type StoredFood,
} from "@/lib/foodHistoryStore";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Pulse" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const [day, setDay] = useState<Date>(new Date());
  const { entries, goals } = useNutrition(day);
  const [addFor, setAddFor] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  const today = useMemo(() => entriesOn(entries, day), [entries, day]);
  const totals = macrosFor(today);

  const add = (entry: Omit<LogEntry, "id" | "loggedAt"> & { loggedAt?: string }) => {
    storeAdd({ ...entry, loggedAt: entry.loggedAt ?? day.toISOString() });
  };
  const update = (id: string, patch: Partial<LogEntry>) => storeUpdate(id, patch);
  const remove = (id: string) => storeRemove(id);

  const isToday = day.toDateString() === new Date().toDateString();
  const dayLabel = isToday
    ? "Today"
    : day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      {/* Header + date stepper */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">Nutrition</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <DayStepper day={day} setDay={setDay} label={dayLabel} />
      </header>

      {/* Summary card */}
      <section className="mt-5 relative rounded-[28px] p-5 overflow-hidden border border-white/[0.06] bg-[linear-gradient(160deg,oklch(0.22_0_0)_0%,oklch(0.16_0_0)_100%)] shadow-[0_10px_40px_-20px_oklch(0_0_0/0.8)]">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-neon/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-5">
          <CalorieRing consumed={Math.round(totals.kcal)} goal={goals.kcal} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tabular-nums">{Math.round(totals.kcal)}</span>
              <span className="text-xs text-muted-foreground">/ {goals.kcal} kcal</span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Daily target
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/10 border border-neon/20">
              <Flame className="size-3 text-neon" />
              <span className="text-[11px] font-semibold text-neon tabular-nums">
                {Math.max(0, goals.kcal - Math.round(totals.kcal))} kcal left
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <MacroChip label="Protein" value={totals.protein} goal={goals.protein} hue="oklch(0.92 0.21 130)" />
          <MacroChip label="Carbs" value={totals.carbs} goal={goals.carbs} hue="oklch(0.82 0.17 65)" />
          <MacroChip label="Fat" value={totals.fat} goal={goals.fat} hue="oklch(0.72 0.18 25)" />
        </div>
      </section>

      {/* Scan CTA */}
      <button
        onClick={() => setAddFor(currentMeal())}
        data-tour="tour-nutrition-log"
        className="group mt-4 w-full rounded-[24px] relative overflow-hidden text-left active:scale-[0.99] transition"
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,oklch(0.92_0.21_130)_0%,oklch(0.85_0.2_150)_55%,oklch(0.78_0.16_180)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,oklch(1_0_0/0.25),transparent_60%)]" />
        <div className="relative p-4 flex items-center gap-4 text-neon-foreground">
          <div className="size-12 rounded-2xl bg-black/15 backdrop-blur grid place-items-center">
            <ScanLine className="size-6" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-[15px] flex items-center gap-1.5">
              Scan a meal <Sparkles className="size-4" />
            </div>
            <div className="text-[11px] opacity-80 leading-snug">
              Use barcode or photo to estimate calories and macros
            </div>
          </div>
          <Camera className="size-5 opacity-80" />
        </div>
      </button>

      {/* Meal sections */}
      <div className="mt-5 space-y-3">
        {meals.map((m) => {
          const items = today.filter((e) => e.meal === m);
          const mTotals = macrosFor(items);
          return (
            <MealSection
              key={m}
              meal={m}
              items={items}
              totals={mTotals}
              onAdd={() => setAddFor(m)}
              onEdit={(e) => setEditing(e)}
              onRemove={remove}
              onServings={(id, s) => update(id, { servings: Math.max(0.25, Math.round(s * 4) / 4) })}
            />
          );
        })}
      </div>

      {addFor && (
        <AddFoodModal
          meal={addFor}
          onClose={() => setAddFor(null)}
          onAdd={(entry) => { add(entry); setAddFor(null); }}
        />
      )}
      {editing && (
        <AddFoodModal
          meal={editing.meal}
          editEntry={editing}
          onClose={() => setEditing(null)}
          onAdd={(entry) => { update(editing.id, entry); setEditing(null); }}
        />
      )}
    </div>
  );
}

function currentMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 21) return "Dinner";
  return "Snack";
}

function DayStepper({ day, setDay, label }: { day: Date; setDay: (d: Date) => void; label: string }) {
  const shift = (delta: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(d);
  };
  const isToday = day.toDateString() === new Date().toDateString();
  return (
    <div className="flex items-center gap-1 rounded-full bg-surface/80 border border-white/[0.06] p-1">
      <button onClick={() => shift(-1)} className="size-8 grid place-items-center rounded-full active:bg-surface-2" aria-label="Previous day">
        <ChevronLeft className="size-4" />
      </button>
      <button
        onClick={() => setDay(new Date())}
        className={cn(
          "h-8 px-3 rounded-full text-xs font-semibold tabular-nums",
          isToday ? "text-neon" : "text-foreground"
        )}
      >
        {label}
      </button>
      <button onClick={() => shift(1)} disabled={isToday} className="size-8 grid place-items-center rounded-full active:bg-surface-2 disabled:opacity-30" aria-label="Next day">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = Math.min(100, (consumed / goal) * 100);
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
        <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke="url(#calGrad)" strokeWidth="8" strokeLinecap="round"
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
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">eaten</div>
          <div className="text-xl font-extrabold tabular-nums leading-none mt-0.5">{consumed}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">kcal</div>
        </div>
      </div>
    </div>
  );
}

function MacroChip({ label, value, goal, hue }: { label: string; value: number; goal: number; hue: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.05] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{goal}g</span>
      </div>
      <div className="mt-1 text-base font-bold tabular-nums">{Math.round(value)}<span className="text-xs text-muted-foreground font-medium">g</span></div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hue }} />
      </div>
    </div>
  );
}

function MealSection({
  meal, items, totals, onAdd, onEdit, onRemove, onServings,
}: {
  meal: Meal;
  items: LogEntry[];
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  onAdd: () => void;
  onEdit: (e: LogEntry) => void;
  onRemove: (id: string) => void;
  onServings: (id: string, s: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="rounded-[22px] bg-white/[0.03] border border-white/[0.05] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <MealThumbnail meal={meal} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] leading-tight">{meal}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {items.length === 0
              ? "No items yet"
              : `${items.length} item${items.length === 1 ? "" : "s"} · ${Math.round(totals.kcal)} kcal`}
          </p>
        </div>
        <button
          onClick={onAdd}
          className="size-9 rounded-full bg-neon text-neon-foreground grid place-items-center active:scale-95 transition glow-neon"
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
            return (
              <li key={e.id} className="border-b border-white/[0.04] last:border-b-0">
                <button
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 text-left rounded-xl active:bg-white/[0.02] transition"
                  aria-expanded={open}
                >
                  <FoodThumbnail food={{ id: e.foodId, name: f.name }} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {f.name}
                      {f.brand ? <span className="text-muted-foreground font-normal"> · {f.brand}</span> : null}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate tabular-nums">
                      {e.servings}× · P{Math.round(f.protein * e.servings)} · C{Math.round(f.carbs * e.servings)} · F{Math.round(f.fat * e.servings)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-neon tabular-nums leading-none">{kcal}</div>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">kcal</div>
                  </div>
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-200",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-2 pb-2.5 pt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full bg-white/[0.05] border border-white/[0.05] p-1">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onServings(e.id, e.servings - 0.5); }}
                          disabled={e.servings <= 0.5}
                          className="size-7 rounded-full grid place-items-center disabled:opacity-30 active:bg-white/10"
                          aria-label="Decrease servings"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-9 text-center text-xs font-semibold tabular-nums">{e.servings}×</span>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); onServings(e.id, e.servings + 0.5); }}
                          className="size-7 rounded-full grid place-items-center active:bg-white/10"
                          aria-label="Increase servings"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setOpenId(null); onEdit(e); }}
                        className="ml-auto h-8 px-3 rounded-full bg-white/[0.05] border border-white/[0.05] text-[11px] font-semibold flex items-center gap-1.5 active:scale-95"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onRemove(e.id); }}
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
  meal, editEntry, onClose, onAdd,
}: {
  meal: Meal;
  editEntry?: LogEntry;
  onClose: () => void;
  onAdd: (entry: AddEntryArg) => void;
}) {
  // When editing, jump straight to manual prefilled from the entry
  const initialPrefill: LookupResult | null = editEntry
    ? (() => {
        const f = entryFood(editEntry);
        return { name: f.name, brand: f.brand, serving: f.serving, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat };
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

  const editSource = editEntry?.custom?.source === "barcode" || editEntry?.custom?.source === "image"
    ? editEntry.custom.source
    : "manual";

  // Confirmation screen takes over the whole sheet when a search result is selected.
  if (confirming) {
    return (
      <Sheet onClose={onClose} title="Confirm food">
        <FoodConfirmSheet
          food={confirming}
          defaultMeal={meal}
          onBack={() => setConfirming(null)}
          onSave={(entry) => { onAdd(entry); onClose(); }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} title={editEntry ? `Edit · ${meal}` : `Add to ${meal}`}>
      {!editEntry && (
        <div className="mt-1 flex gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.05]">
          {([
            { id: "search", label: "Search", Icon: Search },
            { id: "barcode", label: "Barcode", Icon: Barcode },
            { id: "photo", label: "Photo", Icon: ImageIcon },
            { id: "manual", label: "Manual", Icon: Pencil },
          ] as { id: Tab; label: string; Icon: typeof Search }[]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 h-9 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1 transition",
                tab === id ? "bg-neon text-neon-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 pb-6">
        {tab === "search" && <SearchPanel meal={meal} onPick={setConfirming} />}
        {tab === "barcode" && <BarcodePanel onResult={(r) => handleResult(r, "barcode")} />}
        {tab === "photo" && (
          <PhotoPanel
            meal={meal}
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
            source={editEntry ? editSource : ((window as { __scanSource?: "barcode" | "image" }).__scanSource ?? "manual")}
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
    id: b.id, source: "preset", brand: b.brand, name: b.name, serving: b.serving,
    kcal: b.kcal, protein: b.protein, carbs: b.carbs, fat: b.fat, verified: true, category: b.category,
  };
}

function legacyFoodToStored(f: Food): StoredFood {
  return {
    id: `legacy:${f.id}`, source: "preset", brand: f.brand, name: f.name, serving: f.serving,
    kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, verified: false, category: "generic",
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
    if (trimmed.length < 2) { setServerResults([]); setServerErr(false); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true); setServerErr(false);
      try {
        const r = await search({ data: { query: trimmed } });
        if (cancelled) return;
        if (r.ok) setServerResults(r.results);
        else { setServerResults([]); setServerErr(true); }
      } catch (e) {
        console.error("[searchFoodDatabase]", e);
        if (!cancelled) { setServerResults([]); setServerErr(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
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
      <label className="flex items-center gap-3 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.05] px-4">
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
          <button onClick={() => setQ("")} aria-label="Clear" className="size-6 grid place-items-center rounded-full hover:bg-white/[0.06]">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </label>

      {/* Category tabs */}
      <div className="mt-3 -mx-1 px-1 flex gap-1.5 overflow-x-auto scrollbar-none">
        {([
          { id: "all",         label: "All",         Icon: Utensils },
          { id: "restaurant",  label: "Restaurants", Icon: Utensils },
          { id: "grocery",     label: "Grocery",     Icon: Utensils },
          { id: "protein",     label: "Protein",     Icon: Utensils },
          { id: "recent",      label: "Recent",      Icon: History  },
          { id: "favorites",   label: "Favorites",   Icon: Heart    },
        ] as { id: SearchTab; label: string; Icon: typeof Search }[]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "shrink-0 h-8 px-3 rounded-full text-[11px] font-semibold flex items-center gap-1 transition border",
              tab === id
                ? "bg-neon text-neon-foreground border-transparent"
                : "bg-white/[0.04] text-muted-foreground border-white/[0.05]"
            )}
          >
            <Icon className="size-3" /> {label}
            {id === "recent" && recents.length > 0 && <span className="ml-0.5 opacity-70 tabular-nums">{recents.length}</span>}
            {id === "favorites" && favorites.length > 0 && <span className="ml-0.5 opacity-70 tabular-nums">{favorites.length}</span>}
          </button>
        ))}
      </div>

      {/* Popular brands carousel (only when no query and on "all" / category tabs) */}
      {!q && tab !== "recent" && tab !== "favorites" && (
        <>
          <h3 className="mt-5 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">Popular brands</h3>
          <div className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {popularBrands
              .filter((b) => tab === "all" || b.category === tab)
              .map((b) => (
                <button
                  key={b.name}
                  onClick={() => setQ(b.name)}
                  className="shrink-0 h-10 px-3 rounded-full bg-white/[0.04] border border-white/[0.05] text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <span className="text-base leading-none">{b.emoji}</span>
                  <span className="font-medium">{b.name}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {/* Server error notice (graceful — local presets still work) */}
      {serverErr && q.trim().length >= 2 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span>Branded database is unavailable right now — showing curated matches only.</span>
        </div>
      )}

      <h3 className="mt-5 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>
          {tab === "recent" ? "Recently logged"
            : tab === "favorites" ? "Saved favorites"
            : q ? "Results"
            : "Suggested"}
        </span>
        {visible.length > 0 && (
          <span className="normal-case tracking-normal text-[10px] text-muted-foreground/70">{visible.length} items</span>
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
            {tab === "recent" ? "No recent foods yet — start logging!"
              : tab === "favorites" ? "Tap the star on a food to save it here."
              : loading ? "Searching…"
              : q ? "No matches. Try a different search or add manually."
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
    <div className="relative w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.05]">
      <button
        onClick={onPick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.99]"
      >
        <div className="size-10 rounded-xl bg-white/[0.05] grid place-items-center text-lg shrink-0">
          {food.imageUrl ? (
            <img src={food.imageUrl} alt="" className="size-10 rounded-xl object-cover" loading="lazy" />
          ) : (
            <span>{food.category === "restaurant" ? "🍽️" : food.category === "protein" ? "💪" : food.category === "grocery" ? "🛒" : "🥗"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {food.brand && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-neon truncate max-w-[40%]">{food.brand}</span>
            )}
            {food.verified && <BadgeCheck className="size-3 text-neon shrink-0" />}
          </div>
          <div className="font-medium text-sm truncate">{food.name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{food.serving} · {macroLine}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-neon tabular-nums text-sm">{Math.round(food.kcal)}</div>
          <div className="text-[10px] text-muted-foreground">kcal</div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setFav(toggleFavorite(food)); }}
        aria-label={fav ? "Unfavorite" : "Favorite"}
        className="size-8 grid place-items-center rounded-full hover:bg-white/[0.06] shrink-0"
      >
        <Star className={cn("size-4", fav ? "fill-neon text-neon" : "text-muted-foreground")} />
      </button>
    </div>
  );
}

function BarcodePanel({ onResult }: { onResult: (r: LookupResult) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | null = null;
    setStatus("scanning");

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result) => {
            if (stopped || !result) return;
            stopped = true;
            controls?.stop();
            const text = result.getText();
            const r = await foodLookupService.lookupBarcode(text);
            onResult(r);
          }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Camera unavailable";
        setErr(msg);
        setStatus("error");
      }
    })();

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [onResult]);

  const useDemo = async () => {
    const r = await foodLookupService.lookupBarcode("0049000028911");
    onResult(r);
  };

  return (
    <div>
      <div className="aspect-[4/5] rounded-3xl bg-black/40 border border-white/[0.06] relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,oklch(0_0_0/0.7)_100%)] pointer-events-none" />
        {[
          "top-5 left-5 border-t-2 border-l-2",
          "top-5 right-5 border-t-2 border-r-2",
          "bottom-5 left-5 border-b-2 border-l-2",
          "bottom-5 right-5 border-b-2 border-r-2",
        ].map((c) => (
          <span key={c} className={`absolute w-10 h-10 border-neon rounded-md ${c}`} />
        ))}
        {status === "scanning" && (
          <>
            <div className="absolute inset-x-10 top-1/2 h-px bg-neon shadow-[0_0_20px_var(--color-neon)] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute inset-x-0 bottom-6 text-center text-xs text-neon font-medium">
              Point at a barcode
            </div>
          </>
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground mb-3">{err || "Camera unavailable"}</p>
              <button onClick={useDemo} className="h-10 px-4 rounded-full bg-neon text-neon-foreground text-xs font-semibold">
                Try a demo barcode
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        Held steady, your camera will detect any standard product barcode.
      </p>
      <style>{`@keyframes scan { 0%,100% { transform: translateY(-100px); } 50% { transform: translateY(100px); } }`}</style>
    </div>
  );
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
  onAdd,
  onEditManually,
  onDone,
}: {
  meal: Meal;
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
  };

  const runAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const dataUrl = await fileToDataUrl(file);
      const resp = await analyzeFn({ data: { image: dataUrl } });
      if (resp.ok) {
        setResult(resp.result);
      } else {
        setError(
          resp.reason === "no_key"
            ? "AI is not configured yet. Please add foods manually."
            : "Couldn't detect this meal clearly. Try another photo or add food manually.",
        );
      }
    } catch (e) {
      console.error(e);
      setError("Couldn't detect this meal clearly. Try another photo or add food manually.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Confirmation screen ----------
  if (result) {
    return (
      <PhotoConfirm
        meal={meal}
        preview={preview}
        result={result}
        onReanalyze={runAnalyze}
        onEditManually={() => {
          // Collapse all items into a single combined prefill for ManualPanel
          const t = result.total;
          onEditManually({
            name: result.meal_name,
            serving: result.items.map((i) => `${i.name} ${i.estimated_amount}`).join(", ").slice(0, 60),
            kcal: t.calories,
            protein: t.protein,
            carbs: t.carbs,
            fat: t.fat,
            confidence: result.confidence,
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

      {!preview && (
        <div className="mb-3 flex items-start gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 text-[11px] text-muted-foreground">
          <Sparkles className="size-3.5 text-neon shrink-0 mt-0.5" />
          <span>For best results, take the photo from above with the full plate visible.</span>
        </div>
      )}

      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[4/5] rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] grid place-items-center text-center p-6 active:scale-[0.99]"
        >
          <div>
            <div className="size-14 mx-auto rounded-2xl bg-neon/15 grid place-items-center mb-3">
              <Upload className="size-6 text-neon" />
            </div>
            <p className="font-semibold text-sm">Take or upload a meal photo</p>
            <p className="text-[11px] text-muted-foreground mt-1">We'll analyze it with AI</p>
          </div>
        </button>
      ) : (
        <div className="aspect-[4/5] rounded-3xl overflow-hidden relative border border-white/[0.06]">
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
                onClick={runAnalyze}
                className="flex-1 h-10 rounded-full bg-white/10 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="size-3.5" /> Try again
              </button>
            )}
            <button
              onClick={() =>
                onEditManually({ name: "", serving: "1 serving", kcal: 0, protein: 0, carbs: 0, fat: 0 })
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
          onClick={runAnalyze}
          className="mt-4 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon active:scale-[0.98]"
        >
          <Sparkles className="size-4" /> Analyze meal
        </button>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground text-center">
        AI estimates — confirm before saving.
      </p>
    </div>
  );
}

function PhotoConfirm({
  meal,
  preview,
  result,
  onSave,
  onReanalyze,
  onEditManually,
}: {
  meal: Meal;
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
      { name: "", estimated_amount: "1 serving", confidence: 1, calories: 0, protein: 0, carbs: 0, fat: 0 },
    ]);

  const total = items.reduce(
    (a, i) => ({
      calories: a.calories + (Number(i.calories) || 0),
      protein: a.protein + (Number(i.protein) || 0),
      carbs: a.carbs + (Number(i.carbs) || 0),
      fat: a.fat + (Number(i.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

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
      <div className="flex items-center gap-3">
        {preview && (
          <img src={preview} alt="meal" className="size-16 rounded-2xl object-cover border border-white/10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Confirm your meal</p>
          <h3 className="font-bold text-base truncate">{result.meal_name}</h3>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold",
              confColor,
            )}
          >
            {Math.round(result.confidence * 100)}% confidence
          </span>
        </div>
      </div>

      {lowConfidence && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] text-amber-200">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          <span>We're not fully sure. Please confirm the foods and portions below.</span>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-start gap-2">
              <input
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                placeholder="Food name"
                className="flex-1 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 text-sm outline-none focus:border-neon/40"
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
                className="flex-1 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 text-xs outline-none focus:border-neon/40"
                maxLength={30}
              />
              {it.confidence < 0.7 && (
                <span className="text-[10px] text-amber-300 font-medium whitespace-nowrap">
                  {Math.round(it.confidence * 100)}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {k === "calories" ? "kcal" : k.slice(0, 1).toUpperCase() + "(g)"}
                  </span>
                  <input
                    inputMode="numeric"
                    value={String(it[k] ?? 0)}
                    onChange={(e) =>
                      updateItem(idx, {
                        [k]: Math.max(0, Number(e.target.value.replace(/[^0-9]/g, "")) || 0),
                      } as Partial<FoodScanItem>)
                    }
                    className="mt-0.5 h-9 w-full rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 text-xs outline-none focus:border-neon/40 tabular-nums"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={addItem}
          className="w-full h-10 rounded-2xl border border-dashed border-white/15 text-[11px] text-muted-foreground flex items-center justify-center gap-1.5"
        >
          <Plus className="size-3.5" /> Add another item
        </button>
      </div>

      <div className="rounded-2xl bg-neon/10 border border-neon/20 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-neon">Total</span>
          <span className="text-base font-bold tabular-nums">{total.calories} kcal</span>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
          <span>P <span className="text-foreground font-semibold tabular-nums">{total.protein}g</span></span>
          <span>C <span className="text-foreground font-semibold tabular-nums">{total.carbs}g</span></span>
          <span>F <span className="text-foreground font-semibold tabular-nums">{total.fat}g</span></span>
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

function ManualPanel({
  meal, prefill, servings = 1, source, submitLabel, onAdd,
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
  const [kcal, setKcal] = useState<string>(prefill?.kcal != null ? String(Math.round(prefill.kcal)) : "");
  const [protein, setProtein] = useState<string>(prefill?.protein != null ? String(Math.round(prefill.protein)) : "");
  const [carbs, setCarbs] = useState<string>(prefill?.carbs != null ? String(Math.round(prefill.carbs)) : "");
  const [fat, setFat] = useState<string>(prefill?.fat != null ? String(Math.round(prefill.fat)) : "");

  const canSave = name.trim().length > 0 && Number(kcal) >= 0;

  const submit = () => {
    if (!canSave) return;
    onAdd({
      meal,
      servings,
      custom: {
        name: name.trim(),
        brand: brand.trim() || undefined,
        serving: serving.trim() || "1 serving",
        kcal: Number(kcal) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        source,
      },
    });
  };

  return (
    <div className="space-y-3">
      {prefill && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon/10 border border-neon/20 text-[11px] text-neon">
          <Sparkles className="size-3.5" />
          {source === "barcode" ? "Detected from barcode" : "AI-estimated from photo"}
          {prefill.confidence ? ` · ${Math.round(prefill.confidence * 100)}% confidence` : ""}
        </div>
      )}

      <Field label="Food name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken rice bowl" className={inp} maxLength={60} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand (optional)">
          <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inp} maxLength={40} />
        </Field>
        <Field label="Serving size">
          <input value={serving} onChange={(e) => setServing(e.target.value)} placeholder="1 cup, 100g…" className={inp} maxLength={30} />
        </Field>
      </div>
      <Field label="Calories (kcal)">
        <input inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value.replace(/[^0-9]/g, ""))} className={inp} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Protein (g)">
          <input inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value.replace(/[^0-9]/g, ""))} className={inp} />
        </Field>
        <Field label="Carbs (g)">
          <input inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value.replace(/[^0-9]/g, ""))} className={inp} />
        </Field>
        <Field label="Fat (g)">
          <input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value.replace(/[^0-9]/g, ""))} className={inp} />
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
  "h-11 w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 text-sm outline-none focus:border-neon/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  // ensure resultToCustom isn't tree-shaken (used elsewhere via panels)
  void resultToCustom;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade_0.2s_ease-out]"
      />
      <div className="relative w-full max-w-md bg-[oklch(0.16_0_0)] rounded-t-[28px] border-t border-white/[0.08] max-h-[90dvh] overflow-y-auto animate-[slideup_0.25s_ease-out]">
        <div className="sticky top-0 bg-[oklch(0.16_0_0)]/95 backdrop-blur z-10 px-5 pt-3 pb-3 flex items-center justify-between border-b border-white/[0.05]">
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-1 w-10 rounded-full bg-white/15" />
          <h2 className="font-bold text-base mt-2">{title}</h2>
          <button onClick={onClose} className="size-9 rounded-full bg-white/[0.05] grid place-items-center mt-1" aria-label="Close">
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
  onBack,
  onSave,
}: {
  food: StoredFood;
  defaultMeal: Meal;
  onBack: () => void;
  onSave: (entry: AddEntryArg) => void;
}) {
  const [servings, setServings] = useState(1);
  const [serving, setServing] = useState(food.serving);
  const [meal, setMeal] = useState<Meal>(defaultMeal);
  const [when, setWhen] = useState(() => toLocalDatetimeValue(new Date().toISOString()));

  const totals = {
    kcal:    Math.round(food.kcal    * servings),
    protein: Math.round(food.protein * servings * 10) / 10,
    carbs:   Math.round(food.carbs   * servings * 10) / 10,
    fat:     Math.round(food.fat     * servings * 10) / 10,
  };

  const bumpServings = (delta: number) => setServings((s) => Math.max(0.25, Math.round((s + delta) * 4) / 4));

  const submit = () => {
    const loggedAt = fromLocalDatetimeValue(when);
    // Legacy preset (from the original src/lib/foods.ts) → store as foodId reference
    if (food.id.startsWith("legacy:")) {
      const foodId = food.id.slice("legacy:".length);
      onSave({ meal, servings, foodId, loggedAt });
      pushRecent({ ...food, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat });
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
        serving: serving.trim() || food.serving,
        kcal: food.kcal,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: "preset",
      },
    });
    pushRecent(food);
  };

  return (
    <div className="pb-6">
      <button onClick={onBack} className="mt-2 -ml-1 flex items-center gap-1 text-xs text-muted-foreground active:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to search
      </button>

      {/* Food header card */}
      <div className="mt-3 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="size-14 rounded-2xl bg-white/[0.05] grid place-items-center text-2xl shrink-0">
            {food.imageUrl
              ? <img src={food.imageUrl} alt="" className="size-14 rounded-2xl object-cover" />
              : <span>{food.category === "restaurant" ? "🍽️" : food.category === "protein" ? "💪" : food.category === "grocery" ? "🛒" : "🥗"}</span>}
          </div>
          <div className="flex-1 min-w-0">
            {food.brand && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neon truncate">{food.brand}</span>
                {food.verified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-neon/15 border border-neon/30 text-[9px] font-bold text-neon">
                    <BadgeCheck className="size-2.5" /> VERIFIED
                  </span>
                )}
              </div>
            )}
            <h3 className="font-bold text-base leading-tight mt-0.5">{food.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
              Source: {food.source === "preset" ? "curated database"
                : food.source === "nutritionix" ? "Nutritionix"
                : food.source === "usda" ? "USDA FoodData Central"
                : food.source === "openfoodfacts" ? "Open Food Facts"
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
            <div key={m.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-2 py-2">
              <div className="text-base font-bold tabular-nums">{m.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity stepper */}
      <Field label={`Quantity (× ${food.serving})`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => bumpServings(-0.25)}
            disabled={servings <= 0.25}
            className="size-11 rounded-xl bg-white/[0.05] border border-white/[0.06] grid place-items-center disabled:opacity-40"
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
            className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 text-center text-base font-semibold tabular-nums outline-none focus:border-neon/40"
          />
          <button
            onClick={() => bumpServings(0.25)}
            className="size-11 rounded-xl bg-white/[0.05] border border-white/[0.06] grid place-items-center"
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
                "flex-1 h-8 rounded-full text-[11px] font-semibold border",
                servings === n
                  ? "bg-neon text-neon-foreground border-transparent"
                  : "bg-white/[0.04] border-white/[0.06] text-muted-foreground"
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
                "h-10 rounded-xl text-[11px] font-semibold border",
                meal === m
                  ? "bg-neon text-neon-foreground border-transparent"
                  : "bg-white/[0.04] border-white/[0.06] text-muted-foreground"
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
