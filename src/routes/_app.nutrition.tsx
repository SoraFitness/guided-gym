import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, Search, Plus, X, ScanLine, Sparkles, Trash2, Check, ChevronLeft, ChevronRight,
  Barcode, Image as ImageIcon, Pencil, Flame, Loader2, Upload, Minus,
} from "lucide-react";
import {
  foods, meals, loadLog, saveLog, entriesOn, macrosFor, entryFood, loadGoals,
  type Meal, type LogEntry, type Food, type NutritionGoals,
} from "@/lib/foods";
import { foodLookupService, aiFoodScanService, resultToCustom, type LookupResult } from "@/lib/foodLookup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Pulse" }] }),
  component: NutritionPage,
});

function NutritionPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(loadGoals());
  const [day, setDay] = useState<Date>(new Date());
  const [addFor, setAddFor] = useState<Meal | null>(null);
  const [editing, setEditing] = useState<LogEntry | null>(null);

  useEffect(() => {
    setEntries(loadLog());
    setGoals(loadGoals());
    const onFocus = () => setGoals(loadGoals());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const today = useMemo(() => entriesOn(entries, day), [entries, day]);
  const totals = macrosFor(today);

  const add = (entry: Omit<LogEntry, "id" | "loggedAt">) => {
    const next = [
      ...entries,
      { id: crypto.randomUUID(), loggedAt: day.toISOString(), ...entry },
    ];
    setEntries(next);
    saveLog(next);
  };
  const update = (id: string, patch: Partial<LogEntry>) => {
    const next = entries.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEntries(next);
    saveLog(next);
  };
  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveLog(next);
  };

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
  const emoji = { Breakfast: "☀️", Lunch: "🥗", Dinner: "🍽️", Snack: "🍪" }[meal];
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="rounded-[22px] bg-white/[0.03] border border-white/[0.05] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="size-10 rounded-2xl bg-white/[0.04] border border-white/[0.05] grid place-items-center text-lg">
          {emoji}
        </div>
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
                  <span className="size-9 rounded-xl bg-white/[0.04] grid place-items-center text-base shrink-0">
                    {f.emoji}
                  </span>
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

function AddFoodModal({
  meal, editEntry, onClose, onAdd,
}: {
  meal: Meal;
  editEntry?: LogEntry;
  onClose: () => void;
  onAdd: (entry: Omit<LogEntry, "id" | "loggedAt">) => void;
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

  const handleResult = (r: LookupResult, source: "barcode" | "image") => {
    setPrefill({ ...r });
    setTab("manual");
    (window as { __scanSource?: string }).__scanSource = source;
  };

  const editSource = editEntry?.custom?.source === "barcode" || editEntry?.custom?.source === "image"
    ? editEntry.custom.source
    : "manual";

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
        {tab === "search" && <SearchPanel meal={meal} onAdd={onAdd} />}
        {tab === "barcode" && <BarcodePanel onResult={(r) => handleResult(r, "barcode")} />}
        {tab === "photo" && <PhotoPanel onResult={(r) => handleResult(r, "image")} />}
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

function SearchPanel({ meal, onAdd }: { meal: Meal; onAdd: (e: Omit<LogEntry, "id" | "loggedAt">) => void }) {
  const [q, setQ] = useState("");
  const suggested = mealSuggestions(meal);
  const list = q ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())) : foods;

  const pick = (f: Food) => onAdd({ foodId: f.id, meal, servings: 1 });

  return (
    <>
      <label className="flex items-center gap-3 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.05] px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search foods"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={50}
        />
      </label>

      {!q && (
        <>
          <h3 className="mt-5 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Quick add for {meal.toLowerCase()}
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggested.map((f) => (
              <button
                key={f.id}
                onClick={() => pick(f)}
                className="h-9 px-3 rounded-full bg-white/[0.04] border border-white/[0.05] text-xs flex items-center gap-1.5 active:scale-95"
              >
                <span>{f.emoji}</span><span>{f.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="mt-5 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {q ? "Results" : "All foods"}
      </h3>
      <ul className="space-y-2">
        {list.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => pick(f)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.05] text-left active:scale-[0.99]"
            >
              <span className="text-xl">{f.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{f.name}</div>
                <div className="text-[11px] text-muted-foreground">{f.serving} · P{f.protein} C{f.carbs} F{f.fat}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-neon tabular-nums text-sm">{f.kcal}</div>
                <div className="text-[10px] text-muted-foreground">kcal</div>
              </div>
            </button>
          </li>
        ))}
        {list.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No matches.</p>}
      </ul>
    </>
  );
}

function mealSuggestions(meal: Meal): Food[] {
  const tag = meal.toLowerCase();
  const direct = foods.filter((f) => f.tags.includes(tag));
  return [...direct, ...foods.filter((f) => !direct.includes(f))].slice(0, 6);
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

function PhotoPanel({ onResult }: { onResult: (r: LookupResult) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const pick = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    const r = await aiFoodScanService.analyzeImage(file);
    setLoading(false);
    onResult(r);
  };

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
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[4/5] rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] grid place-items-center text-center p-6 active:scale-[0.99]"
        >
          <div>
            <div className="size-14 mx-auto rounded-2xl bg-neon/15 grid place-items-center mb-3">
              <Upload className="size-6 text-neon" />
            </div>
            <p className="font-semibold text-sm">Take or upload a meal photo</p>
            <p className="text-[11px] text-muted-foreground mt-1">We'll estimate calories and macros</p>
          </div>
        </button>
      ) : (
        <div className="aspect-[4/5] rounded-3xl overflow-hidden relative border border-white/[0.06]">
          <img src={preview} alt="meal" className="size-full object-cover" />
          <button
            onClick={() => { setFile(null); setPreview(""); }}
            className="absolute top-3 right-3 size-9 rounded-full bg-black/60 grid place-items-center"
            aria-label="Remove"
          >
            <X className="size-4" />
          </button>
          {loading && (
            <div className="absolute inset-0 bg-black/60 grid place-items-center">
              <div className="text-center">
                <Loader2 className="size-7 text-neon mx-auto animate-spin" />
                <p className="mt-2 text-xs text-neon font-medium">Analyzing meal…</p>
              </div>
            </div>
          )}
        </div>
      )}

      {preview && !loading && (
        <button
          onClick={analyze}
          className="mt-4 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon active:scale-[0.98]"
        >
          <Sparkles className="size-4" /> Analyze meal
        </button>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground text-center">
        AI estimates are for guidance only.
      </p>
    </div>
  );
}

function ManualPanel({
  meal, prefill, source, onAdd,
}: {
  meal: Meal;
  prefill: LookupResult | null;
  source: "manual" | "barcode" | "image";
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
      servings: 1,
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
        <Check className="size-4" /> Save to {meal}
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
