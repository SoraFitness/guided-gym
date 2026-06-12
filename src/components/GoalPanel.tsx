import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Target, Flame, Salad, Apple, Bike, Scale, Sparkles, AlertTriangle, ChevronDown,
  Calendar, Pencil, Plus, ShieldCheck,
} from "lucide-react";
import { useProfile, GOAL_LABELS } from "@/lib/profile";
import {
  computePlan, ACTIVITY_LABELS, SPLIT_LABELS, kgToLbs, lbsToKg,
  type DeficitSplit, type ActivityLevel, type BulkPace,
} from "@/lib/calorieEngine";
import {
  useWeightLog, logWeight, recalibrateMaintenance,
} from "@/lib/weightLogStore";
import { loadLog, entriesOn, macrosFor } from "@/lib/foods";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { setNutritionGoals } from "@/lib/nutritionStore";
import { suggestNutrition } from "@/lib/nutritionService";
import { cn } from "@/lib/utils";

/**
 * Goal & calorie plan panel. All numbers derive from `computePlan` —
 * no hardcoded calorie or burn values anywhere.
 */
export function GoalPanel() {
  const { profile, updateProfile } = useProfile();
  const weights = useWeightLog();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [weighOpen, setWeighOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  if (!profile) return null;

  const imperial = profile.units === "imperial";
  const targetDate = useMemo(
    () => new Date(profile.goalTargetDate),
    [profile.goalTargetDate],
  );

  const plan = useMemo(() => computePlan({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    goalType: profile.goal,
    activity: profile.activityLevel,
    targetDate,
    splitPreset: profile.deficitSplit,
    bulkPace: profile.bulkPace,
  }), [profile, targetDate]);

  // Adaptive recalibration from logged weights + intake
  const recal = useMemo(() => {
    const log = loadLog();
    const days: { date: string; kcal: number }[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const m = macrosFor(entriesOn(log, d));
      if (m.kcal > 0) days.push({ date: d.toISOString().slice(0, 10), kcal: m.kcal });
    }
    return recalibrateMaintenance(weights, days, plan);
  }, [weights, plan]);

  // Plan progress
  const startKg = profile.currentWeightKg;
  const latest = getLatestWeight();
  const currentKg = latest?.kg ?? startKg;
  const goalKg = profile.goalWeightKg;
  const totalDeltaKg = startKg - goalKg;
  const doneKg = startKg - currentKg;
  const progressPct = totalDeltaKg !== 0
    ? Math.max(0, Math.min(100, (doneKg / totalDeltaKg) * 100))
    : 0;

  const fmtWeight = (kg: number) => imperial ? `${kgToLbs(kg).toFixed(0)} lb` : `${kg.toFixed(1)} kg`;
  const fmtWeeklyChange = (kg: number) => {
    const v = imperial ? kgToLbs(kg) : kg;
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(2)} ${imperial ? "lb" : "kg"}/wk`;
  };

  const switchSplit = (s: DeficitSplit) => updateProfile({ deficitSplit: s });
  const applySafePlan = () => {
    if (plan.safeAlternative) {
      updateProfile({ goalTargetDate: plan.safeAlternative.targetDate.toISOString() });
    }
  };

  return (
    <section className="rounded-3xl bg-surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="size-4 text-neon" />
            <h2 className="font-bold">Goal & calories</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {GOAL_LABELS[profile.goal]} · target {targetDate.toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="h-8 px-3 rounded-full bg-white/[0.05] border border-white/[0.06] text-[11px] font-semibold flex items-center gap-1.5"
        >
          <Pencil className="size-3" /> Edit
        </button>
      </div>

      {/* Current vs goal */}
      <div className="mt-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
        <div className="flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Start {fmtWeight(startKg)}</span>
          <span>Goal {fmtWeight(goalKg)}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon to-emerald-300 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="font-semibold tabular-nums">Now {fmtWeight(currentKg)}</span>
          <button
            onClick={() => setWeighOpen(true)}
            className="text-neon font-semibold flex items-center gap-1"
          >
            <Plus className="size-3.5" /> Log weight
          </button>
        </div>
      </div>

      {/* Plan tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Tile icon={Scale} label="Maintenance" value={plan.maintenanceKcal} unit="kcal" />
        <Tile icon={Flame} label="Eat per day" value={plan.recommendedIntakeKcal} unit="kcal" highlight />
        <Tile
          icon={Salad}
          label={plan.effectiveGoal === "gain" ? "Daily surplus" : "Daily deficit"}
          value={Math.abs(plan.dailyDeficitKcal)}
          unit="kcal"
        />
        <Tile icon={Bike} label="Workout burn" value={plan.exerciseBurnTargetKcal} unit="kcal" />
      </div>

      {/* Forecast */}
      <div className="mt-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Projected</div>
          <div className="text-sm font-bold mt-0.5 tabular-nums">
            {fmtWeeklyChange(plan.weeklyChangeKg)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Reaches goal {plan.estimatedGoalDate.toLocaleDateString()}
          </div>
        </div>
        <div className={cn(
          "text-[10px] font-semibold px-2.5 h-7 rounded-full flex items-center gap-1",
          plan.isUnsafe ? "bg-destructive/15 text-destructive" :
          plan.isAggressive ? "bg-amber-500/15 text-amber-400" :
          "bg-neon/15 text-neon",
        )}>
          {plan.isUnsafe ? "Unsafe" : plan.isAggressive ? "Aggressive" : "On track"}
        </div>
      </div>

      {/* Warnings + safer plan */}
      {plan.warnings.length > 0 && (
        <div className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[12px] text-amber-100/90 space-y-1">
              {plan.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          </div>
          {plan.safeAlternative && (
            <button
              onClick={applySafePlan}
              className="mt-3 w-full h-10 rounded-full bg-amber-500 text-amber-950 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="size-4" /> Use safer plan
            </button>
          )}
        </div>
      )}

      {/* Split selector (only when there's a deficit/surplus) */}
      {plan.effectiveGoal === "lose" && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Deficit split
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["mostly_diet", "balanced", "mostly_exercise"] as DeficitSplit[]).map((s) => {
              const active = profile.deficitSplit === s;
              const Icon = s === "mostly_diet" ? Salad : s === "mostly_exercise" ? Flame : Apple;
              return (
                <button
                  key={s}
                  onClick={() => switchSplit(s)}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition",
                    active ? "border-neon bg-neon/10" : "border-white/[0.06] bg-white/[0.03]",
                  )}
                >
                  <Icon className={cn("size-4 mb-1.5", active ? "text-neon" : "text-muted-foreground")} />
                  <div className="text-[11px] font-bold leading-tight">{SPLIT_LABELS[s]}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recalibration */}
      <div className="mt-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-neon" />
          <div className="text-sm font-bold">Smart adjustment</div>
        </div>
        {recal.enoughData ? (
          <>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Observed maintenance</div>
                <div className="font-bold tabular-nums">{recal.blendedMaintenanceKcal} kcal</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg intake</div>
                <div className="font-bold tabular-nums">{recal.avgDailyIntake} kcal</div>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">{recal.suggestion}</p>
            <button
              onClick={() => {
                // Apply observed maintenance into the macro plan by updating goals
                const next = suggestNutrition({
                  ...profile,
                  // Approximate: shift goal weight projections using observed maintenance by
                  // calling computePlan with override below and re-deriving macros.
                });
                // Re-compute with observed maintenance, then push macros
                const plan2 = computePlan({
                  gender: profile.gender, age: profile.age, heightCm: profile.heightCm,
                  currentWeightKg: profile.currentWeightKg, goalWeightKg: profile.goalWeightKg,
                  goalType: profile.goal, activity: profile.activityLevel,
                  targetDate, splitPreset: profile.deficitSplit, bulkPace: profile.bulkPace,
                  observedMaintenanceKcal: recal.blendedMaintenanceKcal,
                });
                setNutritionGoals({
                  kcal: plan2.recommendedIntakeKcal,
                  protein: next.protein, carbs: next.carbs, fat: next.fat,
                });
              }}
              className="mt-3 w-full h-10 rounded-full bg-neon text-neon-foreground font-semibold text-xs"
            >
              Apply adjustment to my targets
            </button>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">{recal.suggestion}</p>
        )}
      </div>

      {/* How we calculated this */}
      <button
        onClick={() => setExplainOpen((v) => !v)}
        className="mt-4 w-full flex items-center justify-between text-xs text-muted-foreground"
      >
        <span className="font-semibold">How we calculated this</span>
        <ChevronDown className={cn("size-4 transition-transform", explainOpen && "rotate-180")} />
      </button>
      {explainOpen && (
        <div className="mt-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 text-[12px] text-muted-foreground space-y-2 leading-relaxed">
          <p>
            <span className="text-foreground font-semibold">BMR (Mifflin–St Jeor):</span>{" "}
            10 × {profile.currentWeightKg.toFixed(1)}kg + 6.25 × {profile.heightCm}cm − 5 × {profile.age}
            {profile.gender === "male" ? " + 5" : profile.gender === "female" ? " − 161" : " − 78"} ={" "}
            <span className="tabular-nums text-foreground">{plan.bmrKcal} kcal</span>
          </p>
          <p>
            <span className="text-foreground font-semibold">TDEE:</span>{" "}
            BMR × {ACTIVITY_LABELS[profile.activityLevel].toLowerCase()} multiplier ={" "}
            <span className="tabular-nums text-foreground">{plan.formulaMaintenanceKcal} kcal</span>
          </p>
          {plan.effectiveGoal === "lose" && (
            <>
              <p>
                <span className="text-foreground font-semibold">Deficit:</span>{" "}
                {totalDeltaKg.toFixed(1)} kg × 7700 ÷ {plan.daysToTarget} days ≈{" "}
                <span className="tabular-nums text-foreground">{plan.dailyDeficitKcal} kcal/day</span>
              </p>
              <p>
                <span className="text-foreground font-semibold">Split ({SPLIT_LABELS[plan.splitPreset]}):</span>{" "}
                eat {plan.recommendedIntakeKcal} kcal · burn {plan.exerciseBurnTargetKcal} kcal in workouts.
              </p>
            </>
          )}
          {plan.effectiveGoal === "gain" && (
            <p>
              <span className="text-foreground font-semibold">Surplus:</span>{" "}
              TDEE × {profile.bulkPace === "faster" ? "12%" : "7%"} ={" "}
              <span className="tabular-nums text-foreground">+{Math.abs(plan.dailyDeficitKcal)} kcal/day</span>
            </p>
          )}
          {plan.notes.map((n, i) => <p key={i}>{n}</p>)}
          <p className="text-[11px] opacity-70 pt-1 border-t border-white/[0.05] mt-2">
            These are estimates. Track your weight weekly and we'll fine-tune the numbers.
          </p>
        </div>
      )}

      {/* Edit goal sheet */}
      <EditGoalSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currentKg={profile.currentWeightKg}
        goalKg={profile.goalWeightKg}
        targetDate={targetDate}
        activity={profile.activityLevel}
        bodyFatPct={profile.bodyFatPct}
        avgStepsPerDay={profile.avgStepsPerDay}
        bulkPace={profile.bulkPace ?? "lean"}
        units={profile.units ?? "metric"}
        onSave={(patch) => {
          updateProfile(patch);
          setEditOpen(false);
        }}
      />

      {/* Log weight sheet */}
      <LogWeightSheet
        open={weighOpen}
        startKg={currentKg}
        units={profile.units ?? "metric"}
        onClose={() => setWeighOpen(false)}
        onSave={(kg) => {
          logWeight(kg);
          updateProfile({ currentWeightKg: kg });
          setWeighOpen(false);
        }}
      />
    </section>
  );
}

function Tile({
  icon: Icon, label, value, unit, highlight,
}: { icon: typeof Flame; label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border",
      highlight ? "bg-neon/10 border-neon/30" : "bg-white/[0.03] border-white/[0.05]",
    )}>
      <Icon className={cn("size-4", highlight ? "text-neon" : "text-muted-foreground")} />
      <div className="mt-3 text-xl font-extrabold tabular-nums leading-none">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
        {label} · {unit}
      </div>
    </div>
  );
}

function EditGoalSheet({
  open, onClose, onSave, currentKg, goalKg, targetDate, activity, bodyFatPct,
  avgStepsPerDay, bulkPace, units,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
  currentKg: number;
  goalKg: number;
  targetDate: Date;
  activity: ActivityLevel;
  bodyFatPct?: number;
  avgStepsPerDay?: number;
  bulkPace: BulkPace;
  units: "metric" | "imperial";
}) {
  const [g, setG] = useState(goalKg);
  const [c, setC] = useState(currentKg);
  const [dateStr, setDateStr] = useState(targetDate.toISOString().slice(0, 10));
  const [act, setAct] = useState<ActivityLevel>(activity);
  const [bf, setBf] = useState<string>(bodyFatPct?.toString() ?? "");
  const [steps, setSteps] = useState<string>(avgStepsPerDay?.toString() ?? "");
  const [bp, setBp] = useState<BulkPace>(bulkPace);

  const imperial = units === "imperial";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl max-h-[90dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit goal</SheetTitle>
          <SheetDescription>Update your numbers — we'll recalculate everything.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label={`Current weight (${imperial ? "lb" : "kg"})`}
              value={imperial ? kgToLbs(c).toFixed(0) : c.toFixed(1)}
              onChange={(v) => {
                const n = parseFloat(v); if (!Number.isFinite(n)) return;
                setC(imperial ? lbsToKg(n) : n);
              }}
            />
            <NumField
              label={`Goal weight (${imperial ? "lb" : "kg"})`}
              value={imperial ? kgToLbs(g).toFixed(0) : g.toFixed(1)}
              onChange={(v) => {
                const n = parseFloat(v); if (!Number.isFinite(n)) return;
                setG(imperial ? lbsToKg(n) : n);
              }}
            />
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
              Target date
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="size-4 text-neon" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 text-base outline-none focus:border-neon/40 [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Activity level</div>
            <div className="grid grid-cols-2 gap-2">
              {(["sedentary", "light", "moderate", "very", "athlete"] as ActivityLevel[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAct(a)}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-semibold",
                    act === a ? "border-neon bg-neon/10 text-neon" : "border-white/[0.06] bg-white/[0.03]",
                  )}
                >
                  {ACTIVITY_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Body fat % (opt)"
              value={bf}
              onChange={setBf}
              placeholder="—"
            />
            <NumField
              label="Avg steps/day (opt)"
              value={steps}
              onChange={setSteps}
              placeholder="—"
            />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Bulk pace</div>
            <div className="grid grid-cols-2 gap-2">
              {(["lean", "faster"] as BulkPace[]).map((b) => (
                <button
                  key={b}
                  onClick={() => setBp(b)}
                  className={cn(
                    "h-11 rounded-xl border text-xs font-semibold capitalize",
                    bp === b ? "border-neon bg-neon/10 text-neon" : "border-white/[0.06] bg-white/[0.03]",
                  )}
                >
                  {b} bulk
                </button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-5">
          <button
            onClick={() => {
              const bfNum = parseFloat(bf);
              const stepsNum = parseFloat(steps);
              onSave({
                currentWeightKg: c,
                goalWeightKg: g,
                goalTargetDate: new Date(dateStr).toISOString(),
                activityLevel: act,
                bodyFatPct: Number.isFinite(bfNum) && bfNum > 0 ? bfNum : undefined,
                avgStepsPerDay: Number.isFinite(stepsNum) && stepsNum > 0 ? stepsNum : undefined,
                bulkPace: bp,
              });
            }}
            className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Save & recalculate
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function LogWeightSheet({
  open, onClose, onSave, startKg, units,
}: {
  open: boolean; onClose: () => void; onSave: (kg: number) => void;
  startKg: number; units: "metric" | "imperial";
}) {
  const imperial = units === "imperial";
  const [val, setVal] = useState(
    imperial ? kgToLbs(startKg).toFixed(0) : startKg.toFixed(1),
  );
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Log today's weight</SheetTitle>
          <SheetDescription>We use this to fine-tune your calorie targets over time.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">
            Weight ({imperial ? "lb" : "kg"})
          </label>
          <input
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))}
            className="mt-2 h-14 w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 text-2xl font-extrabold tabular-nums outline-none focus:border-neon/40"
          />
        </div>
        <SheetFooter className="mt-5">
          <button
            onClick={() => {
              const n = parseFloat(val);
              if (!Number.isFinite(n) || n <= 0) return;
              onSave(imperial ? lbsToKg(n) : n);
            }}
            className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Save weight
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function NumField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block rounded-2xl bg-white/[0.03] border border-white/[0.05] p-3">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className="mt-1 h-9 w-full bg-transparent text-base font-semibold tabular-nums outline-none"
      />
    </label>
  );
}
