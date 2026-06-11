import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Search, Plus, X, ScanLine, Sparkles, Trash2, Check } from "lucide-react";
import { foods, meals, loadLog, saveLog, todayEntries, macrosFor, type Meal, type LogEntry, type Food } from "@/lib/foods";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — Pulse" }] }),
  component: NutritionPage,
});

const goals = { kcal: 2100, protein: 140, carbs: 230, fat: 70 };

function NutritionPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [pickerOpen, setPickerOpen] = useState<Meal | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => setEntries(loadLog()), []);

  const today = useMemo(() => todayEntries(entries), [entries]);
  const totals = macrosFor(today);

  const add = (food: Food, meal: Meal, servings = 1) => {
    const next = [
      ...entries,
      { id: crypto.randomUUID(), foodId: food.id, meal, servings, loggedAt: new Date().toISOString() },
    ];
    setEntries(next);
    saveLog(next);
  };
  const remove = (id: string) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    saveLog(next);
  };

  return (
    <div className="px-5 pt-6 animate-slide-up">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nutrition</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </header>

      {/* Calorie ring + macros */}
      <section className="mt-6 rounded-3xl bg-surface p-5">
        <div className="flex items-center gap-5">
          <CalorieRing consumed={Math.round(totals.kcal)} goal={goals.kcal} />
          <div className="flex-1 space-y-3">
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="oklch(0.92 0.21 130)" />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="oklch(0.78 0.18 60)" />
            <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="oklch(0.72 0.2 25)" />
          </div>
        </div>
      </section>

      {/* Scan CTA */}
      <button
        onClick={() => setScanOpen(true)}
        className="mt-4 w-full rounded-3xl bg-gradient-to-br from-neon to-emerald-400 text-neon-foreground p-5 flex items-center gap-4 glow-neon active:scale-[0.99] transition"
      >
        <div className="size-12 rounded-2xl bg-black/15 grid place-items-center">
          <ScanLine className="size-6" />
        </div>
        <div className="text-left flex-1">
          <div className="font-bold text-base flex items-center gap-1.5">
            Scan a meal <Sparkles className="size-4" />
          </div>
          <div className="text-xs opacity-80">Point your camera — we'll estimate macros</div>
        </div>
        <Camera className="size-5" />
      </button>

      {/* Meal sections */}
      <div className="mt-6 space-y-4">
        {meals.map((m) => {
          const entriesForMeal = today.filter((e) => e.meal === m);
          const mealKcal = entriesForMeal.reduce((s, e) => {
            const f = foods.find((x) => x.id === e.foodId);
            return s + (f ? f.kcal * e.servings : 0);
          }, 0);
          return (
            <section key={m} className="rounded-3xl bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">{m}</h3>
                  <p className="text-xs text-muted-foreground">{Math.round(mealKcal)} kcal logged</p>
                </div>
                <button
                  onClick={() => setPickerOpen(m)}
                  className="size-9 rounded-full bg-neon text-neon-foreground grid place-items-center active:scale-95 transition"
                  aria-label={`Add to ${m}`}
                >
                  <Plus className="size-5" />
                </button>
              </div>
              {entriesForMeal.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {entriesForMeal.map((e) => {
                    const f = foods.find((x) => x.id === e.foodId)!;
                    return (
                      <li key={e.id} className="flex items-center gap-3 py-2">
                        <span className="text-2xl">{f.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.servings}× · {Math.round(f.kcal * e.servings)} kcal
                          </div>
                        </div>
                        <button
                          onClick={() => remove(e.id)}
                          className="size-8 rounded-full bg-surface-2 grid place-items-center text-muted-foreground active:scale-95"
                          aria-label="Remove"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {pickerOpen && (
        <FoodPicker meal={pickerOpen} onClose={() => setPickerOpen(null)} onAdd={add} />
      )}
      {scanOpen && (
        <ScanSheet
          onClose={() => setScanOpen(false)}
          onConfirm={(food) => {
            add(food, currentMeal(), 1);
            setScanOpen(false);
          }}
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

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = Math.min(100, (consumed / goal) * 100);
  const remaining = Math.max(0, goal - consumed);
  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.3 0 0)" strokeWidth="9" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke="var(--color-neon)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 264} 264`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-extrabold tabular-nums">{remaining}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">remaining</div>
        </div>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{Math.round(value)} / {goal}g</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function FoodPicker({
  meal, onClose, onAdd,
}: { meal: Meal; onClose: () => void; onAdd: (f: Food, m: Meal, s: number) => void }) {
  const [q, setQ] = useState("");
  const suggested = mealSuggestions(meal);
  const list = q
    ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    : foods;

  return (
    <Sheet onClose={onClose} title={`Add to ${meal}`}>
      <label className="flex items-center gap-3 h-12 rounded-full bg-surface px-4 mt-2">
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
          <h3 className="mt-5 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Suggested for {meal.toLowerCase()}
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggested.map((f) => (
              <button
                key={f.id}
                onClick={() => { onAdd(f, meal, 1); onClose(); }}
                className="h-10 px-3 rounded-full bg-surface border border-border text-sm flex items-center gap-1.5 active:scale-95 transition"
              >
                <span>{f.emoji}</span>
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <h3 className="mt-6 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
        {q ? "Results" : "All foods"}
      </h3>
      <ul className="space-y-2 pb-6">
        {list.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => { onAdd(f, meal, 1); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border text-left active:scale-[0.99] transition"
            >
              <span className="text-2xl">{f.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.serving} · P{f.protein} C{f.carbs} F{f.fat}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-neon tabular-nums">{f.kcal}</div>
                <div className="text-[10px] text-muted-foreground">kcal</div>
              </div>
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No matches.</p>
        )}
      </ul>
    </Sheet>
  );
}

function mealSuggestions(meal: Meal): Food[] {
  const tag = meal.toLowerCase();
  const direct = foods.filter((f) => f.tags.includes(tag));
  if (direct.length >= 4) return direct.slice(0, 8);
  return [...direct, ...foods.filter((f) => !direct.includes(f))].slice(0, 8);
}

function ScanSheet({ onClose, onConfirm }: { onClose: () => void; onConfirm: (f: Food) => void }) {
  const [phase, setPhase] = useState<"scanning" | "result">("scanning");
  const [detected, setDetected] = useState<Food | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      // Pick a plausible scanned item
      const pool = foods.filter((f) => ["hashbrowns", "eggs", "salmon", "chicken-breast", "oatmeal"].includes(f.id));
      setDetected(pool[Math.floor(Math.random() * pool.length)]);
      setPhase("result");
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Sheet onClose={onClose} title="Scan a meal">
      <div className="mt-2 aspect-square rounded-3xl bg-surface border border-border relative overflow-hidden">
        {/* faux camera viewfinder */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,oklch(0.25_0_0),oklch(0.12_0_0))]" />
        {/* corner brackets */}
        {[
          "top-4 left-4 border-t-2 border-l-2",
          "top-4 right-4 border-t-2 border-r-2",
          "bottom-4 left-4 border-b-2 border-l-2",
          "bottom-4 right-4 border-b-2 border-r-2",
        ].map((c) => (
          <span key={c} className={`absolute w-8 h-8 border-neon rounded-md ${c}`} />
        ))}
        {phase === "scanning" && (
          <>
            <div className="absolute inset-x-8 top-1/2 h-px bg-neon shadow-[0_0_20px_var(--color-neon)] animate-[scan_1.8s_ease-in-out_infinite]" />
            <div className="absolute inset-x-0 bottom-6 text-center text-sm text-neon font-medium">
              Analyzing…
            </div>
          </>
        )}
        {phase === "result" && detected && (
          <div className="absolute inset-0 grid place-items-center text-center p-6">
            <div className="animate-slide-up">
              <div className="text-7xl">{detected.emoji}</div>
              <h3 className="mt-4 text-2xl font-extrabold">{detected.name}</h3>
              <p className="text-sm text-muted-foreground">{detected.serving}</p>
              <div className="mt-4 flex justify-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-surface-2">{detected.kcal} kcal</span>
                <span className="px-2 py-1 rounded-full bg-surface-2">P{detected.protein}</span>
                <span className="px-2 py-1 rounded-full bg-surface-2">C{detected.carbs}</span>
                <span className="px-2 py-1 rounded-full bg-surface-2">F{detected.fat}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {phase === "result" && detected ? (
        <button
          onClick={() => onConfirm(detected)}
          className="mt-5 w-full h-14 rounded-full bg-neon text-neon-foreground font-semibold flex items-center justify-center gap-2 glow-neon active:scale-[0.98]"
        >
          <Check className="size-5" /> Log to {currentMeal()}
        </button>
      ) : (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Hold steady so we can detect the food.
        </p>
      )}

      <style>{`@keyframes scan { 0%,100% { transform: translateY(-90px); } 50% { transform: translateY(90px); } }`}</style>
    </Sheet>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade_0.2s_ease-out]"
      />
      <div className="relative w-full max-w-md bg-background rounded-t-[2rem] border-t border-border max-h-[88dvh] overflow-y-auto animate-[slideup_0.25s_ease-out]">
        <div className="sticky top-0 bg-background/95 backdrop-blur z-10 px-5 pt-3 pb-3 flex items-center justify-between border-b border-border">
          <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-1 w-10 rounded-full bg-surface-2" />
          <h2 className="font-bold text-lg mt-2">{title}</h2>
          <button
            onClick={onClose}
            className="size-9 rounded-full bg-surface grid place-items-center mt-1"
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
  );
}
