import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Flame, Dumbbell, Sparkles, Heart, Activity, Home, Building2,
  TrendingDown, Mountain, Layers, Calendar, Zap, Footprints, Salad, Apple, Bike,
} from "lucide-react";
import { AnimatedAthlete } from "@/components/AnimatedAthlete";
import {
  useProfile, GOAL_LABELS, EQUIPMENT_LABELS, EXPERIENCE_LABELS, NUTRITION_LABELS, FOCUS_LABELS,
  type Profile, type Goal, type Gender, type ExperienceLevel, type EquipmentSetup,
  type FocusArea, type NutritionPlan,
} from "@/lib/profile";
import {
  ACTIVITY_LABELS, ACTIVITY_DESCRIPTIONS, SPLIT_LABELS,
  type ActivityLevel, type DeficitSplit, type BulkPace,
} from "@/lib/calorieEngine";
import { suggestNutrition } from "@/lib/nutritionService";
import { saveGoals } from "@/lib/foods";
import { workoutRecommendationService } from "@/lib/workouts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started — Pulse" },
      { name: "description", content: "Tell us about you and get a personalized training plan." },
    ],
  }),
  component: Onboarding,
});

interface Draft {
  name: string;
  goal: Goal;
  experience: ExperienceLevel;
  equipment: EquipmentSetup;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 20 | 30 | 45 | 60;
  focusAreas: FocusArea[];
  currentWeightKg: number;
  goalWeightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  bodyFatPct?: number;
  activityLevel: ActivityLevel;
  avgStepsPerDay?: number;
  goalTargetDate: string; // ISO
  deficitSplit: DeficitSplit;
  bulkPace: BulkPace;
  nutritionPlan: NutritionPlan;
  units: "metric" | "imperial";
}

const defaultTargetDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 84);
  return d.toISOString();
};

const DEFAULT_DRAFT: Draft = {
  name: "",
  goal: "build_muscle",
  experience: "intermediate",
  equipment: "dumbbells",
  daysPerWeek: 4,
  sessionMinutes: 45,
  focusAreas: ["chest", "back", "legs"],
  currentWeightKg: 75,
  goalWeightKg: 72,
  heightCm: 175,
  age: 26,
  gender: "other",
  bodyFatPct: undefined,
  activityLevel: "moderate",
  avgStepsPerDay: undefined,
  goalTargetDate: defaultTargetDate(),
  deficitSplit: "balanced",
  bulkPace: "lean",
  nutritionPlan: "muscle_gain",
  units: "metric",
};


const TOTAL = 12; // 0 welcome + 11 question steps

function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [generating, setGenerating] = useState(false);
  const [d, setD] = useState<Draft>(DEFAULT_DRAFT);

  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return d.name.trim().length >= 2;
      case 6: return d.focusAreas.length > 0;
      case 7: return d.currentWeightKg > 0 && d.heightCm > 0 && d.age > 0 && d.goalWeightKg > 0;
      case 9: return !!d.goalTargetDate && new Date(d.goalTargetDate).getTime() > Date.now();
      default: return true;
    }
  }, [step, d]);


  const goNext = () => {
    if (!canNext) return;
    if (step === TOTAL - 1) return finish();
    setDir(1);
    setStep((s) => s + 1);
  };
  const goBack = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const finish = () => {
    setGenerating(true);
    const profile: Profile = { ...d, name: d.name.trim() || "Athlete", completedAt: new Date().toISOString() };
    // Persist personalized nutrition goals
    saveGoals(suggestNutrition(profile));
    setTimeout(() => {
      setProfile(profile);
      navigate({ to: "/paywall" });
    }, 1800);
  };

  if (generating) {
    return (
      <div className="min-h-dvh bg-background grid place-items-center px-6 text-center">
        <div className="animate-slide-up">
          <AnimatedAthlete size={240} className="mx-auto" />
          <h2 className="mt-8 text-2xl font-bold">Building your plan</h2>
          <p className="mt-2 text-muted-foreground">Tailoring workouts and nutrition…</p>
        </div>
      </div>
    );
  }

  const stepLabels = ["", "Goal", "Experience", "Equipment", "Schedule", "Session", "Focus", "About you", "Nutrition", "Plan"];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-6">
        {step > 0 ? (
          <button
            onClick={goBack}
            className="size-10 grid place-items-center rounded-full bg-white/[0.05] border border-white/[0.06]"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <div className="size-10" />
        )}
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-neon rounded-full"
              initial={false}
              animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>{stepLabels[step] || "Welcome"}</span>
            <span className="tabular-nums">{step + 1} / {TOTAL}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-6 pb-36 overflow-y-auto">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
          >
            {step === 0 && <Welcome name={d.name} onName={(n) => update("name", n)} />}
            {step === 1 && <GoalStep value={d.goal} onChange={(g) => update("goal", g)} />}
            {step === 2 && <ExperienceStep value={d.experience} onChange={(g) => update("experience", g)} />}
            {step === 3 && <EquipmentStep value={d.equipment} onChange={(g) => update("equipment", g)} />}
            {step === 4 && <DaysStep value={d.daysPerWeek} onChange={(g) => update("daysPerWeek", g)} />}
            {step === 5 && <SessionStep value={d.sessionMinutes} onChange={(g) => update("sessionMinutes", g)} />}
            {step === 6 && <FocusStep value={d.focusAreas} onChange={(g) => update("focusAreas", g)} />}
            {step === 7 && <BodyStep d={d} update={update} />}
            {step === 8 && <NutritionStep value={d.nutritionPlan} onChange={(g) => update("nutritionPlan", g)} />}
            {step === 9 && <ReviewStep d={d} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-6 bg-gradient-to-t from-background via-background/95 to-transparent">
        <button
          disabled={!canNext}
          onClick={goNext}
          className={cn(
            "w-full h-14 rounded-full font-semibold text-base flex items-center justify-center gap-2 transition",
            canNext
              ? "bg-neon text-neon-foreground glow-neon active:scale-[0.98]"
              : "bg-white/[0.05] text-muted-foreground"
          )}
        >
          {step === TOTAL - 1 ? "Build My Plan" : step === 0 ? "Get Started" : "Continue"}
          <ArrowRight className="size-5" />
        </button>
      </footer>
    </div>
  );
}

/* -------- Step components -------- */

function Welcome({ name, onName }: { name: string; onName: (n: string) => void }) {
  return (
    <div className="text-center pt-2">
      <AnimatedAthlete size={220} className="mx-auto" />
      <h1 className="mt-6 text-[32px] leading-tight font-extrabold text-balance">
        Let's build the plan that<br />
        <span className="text-neon">moves you forward</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground text-balance">
        A few quick questions and we'll personalize workouts, nutrition, and your weekly schedule.
      </p>
      <div className="mt-8 text-left">
        <label className="text-[11px] uppercase tracking-wider text-muted-foreground">What should we call you?</label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Your first name"
          maxLength={32}
          className="mt-2 h-14 w-full rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 text-base outline-none focus:border-neon/40"
        />
      </div>
    </div>
  );
}

function StepHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[26px] leading-tight font-extrabold">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ChoiceCard({
  active, onClick, icon: Icon, label, sub,
}: {
  active: boolean;
  onClick: () => void;
  icon?: typeof Flame;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition",
        active
          ? "border-neon bg-neon/10"
          : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"
      )}
    >
      {Icon && (
        <span
          className={cn(
            "size-11 rounded-xl grid place-items-center shrink-0",
            active ? "bg-neon text-neon-foreground" : "bg-white/[0.05] text-foreground"
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px]">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <span
        className={cn(
          "size-6 rounded-full border-2 grid place-items-center shrink-0",
          active ? "border-neon bg-neon text-neon-foreground" : "border-white/15"
        )}
      >
        {active && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function GoalStep({ value, onChange }: { value: Goal; onChange: (g: Goal) => void }) {
  const items: { id: Goal; icon: typeof Flame; sub: string }[] = [
    { id: "lose_weight", icon: TrendingDown, sub: "Burn fat and slim down" },
    { id: "build_muscle", icon: Dumbbell, sub: "Add lean muscle and strength" },
    { id: "recomp", icon: Layers, sub: "Build muscle while losing fat" },
    { id: "endurance", icon: Activity, sub: "Improve cardio and stamina" },
    { id: "maintain", icon: Mountain, sub: "Stay sharp and consistent" },
  ];
  return (
    <div>
      <StepHeader title="What's your main goal?" sub="We'll tune training and nutrition around this." />
      <div className="space-y-2.5">
        {items.map(({ id, icon, sub }) => (
          <ChoiceCard key={id} active={value === id} onClick={() => onChange(id)} icon={icon} label={GOAL_LABELS[id]} sub={sub} />
        ))}
      </div>
    </div>
  );
}

function ExperienceStep({ value, onChange }: { value: ExperienceLevel; onChange: (v: ExperienceLevel) => void }) {
  const items: { id: ExperienceLevel; sub: string }[] = [
    { id: "beginner", sub: "New to training, learning movements" },
    { id: "intermediate", sub: "Consistent for 6+ months" },
    { id: "advanced", sub: "Experienced lifter, structured programs" },
  ];
  return (
    <div>
      <StepHeader title="Your experience level" sub="So we pick the right intensity and volume." />
      <div className="space-y-2.5">
        {items.map(({ id, sub }) => (
          <ChoiceCard key={id} active={value === id} onClick={() => onChange(id)} label={EXPERIENCE_LABELS[id]} sub={sub} />
        ))}
      </div>
    </div>
  );
}

function EquipmentStep({ value, onChange }: { value: EquipmentSetup; onChange: (v: EquipmentSetup) => void }) {
  const items: { id: EquipmentSetup; icon: typeof Home; sub: string }[] = [
    { id: "none", icon: Home, sub: "Bodyweight workouts, anywhere" },
    { id: "dumbbells", icon: Dumbbell, sub: "Adjustable or fixed dumbbells" },
    { id: "gym", icon: Building2, sub: "Barbells, machines, cables" },
    { id: "mixed", icon: Layers, sub: "Combination of home + gym" },
  ];
  return (
    <div>
      <StepHeader title="Where do you train?" sub="We only recommend workouts you can actually do." />
      <div className="space-y-2.5">
        {items.map(({ id, icon, sub }) => (
          <ChoiceCard key={id} active={value === id} onClick={() => onChange(id)} icon={icon} label={EQUIPMENT_LABELS[id]} sub={sub} />
        ))}
      </div>
    </div>
  );
}

function DaysStep({ value, onChange }: { value: 2 | 3 | 4 | 5 | 6; onChange: (v: 2 | 3 | 4 | 5 | 6) => void }) {
  const options = [2, 3, 4, 5, 6] as const;
  return (
    <div>
      <StepHeader title="Days per week" sub="How often can you realistically train?" />
      <div className="grid grid-cols-5 gap-2">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "aspect-square rounded-2xl border flex flex-col items-center justify-center transition",
              value === n
                ? "border-neon bg-neon/10 text-neon"
                : "border-white/[0.06] bg-white/[0.03]"
            )}
          >
            <span className="text-2xl font-extrabold tabular-nums">{n}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">days</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        We'll build a {value}-day split that fits your week.
      </p>
    </div>
  );
}

function SessionStep({ value, onChange }: { value: 20 | 30 | 45 | 60; onChange: (v: 20 | 30 | 45 | 60) => void }) {
  const options = [20, 30, 45, 60] as const;
  return (
    <div>
      <StepHeader title="How long per session?" sub="We'll fit workouts inside this window." />
      <div className="grid grid-cols-2 gap-3">
        {options.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              "h-24 rounded-2xl border flex flex-col items-center justify-center transition",
              value === n ? "border-neon bg-neon/10" : "border-white/[0.06] bg-white/[0.03]"
            )}
          >
            <span className="text-3xl font-extrabold tabular-nums">{n}</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">minutes</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FocusStep({ value, onChange }: { value: FocusArea[]; onChange: (v: FocusArea[]) => void }) {
  const areas = Object.keys(FOCUS_LABELS) as FocusArea[];
  const toggle = (a: FocusArea) =>
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  return (
    <div>
      <StepHeader title="What do you want to focus on?" sub="Pick at least one. You can change this anytime." />
      <div className="grid grid-cols-2 gap-2.5">
        {areas.map((a) => {
          const active = value.includes(a);
          return (
            <button
              key={a}
              onClick={() => toggle(a)}
              className={cn(
                "h-14 rounded-2xl border font-semibold transition flex items-center justify-center gap-2",
                active ? "border-neon bg-neon/10 text-neon" : "border-white/[0.06] bg-white/[0.03]"
              )}
            >
              {FOCUS_LABELS[a]}
              {active && <Check className="size-4" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BodyStep({ d, update }: { d: Draft; update: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const imperial = d.units === "imperial";
  return (
    <div>
      <StepHeader title="A bit about your body" sub="We use this to calibrate calorie and macro targets." />

      {/* Units toggle */}
      <div className="mb-4 inline-flex rounded-full bg-white/[0.04] border border-white/[0.06] p-1">
        {(["metric", "imperial"] as const).map((u) => (
          <button
            key={u}
            onClick={() => update("units", u)}
            className={cn(
              "px-4 h-9 rounded-full text-xs font-semibold uppercase tracking-wider transition",
              d.units === u ? "bg-neon text-neon-foreground" : "text-muted-foreground"
            )}
          >
            {u === "metric" ? "kg · cm" : "lb · in"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <Slider label="Age" value={d.age} min={14} max={80} suffix="years" onChange={(v) => update("age", v)} />

        {imperial ? (
          <HeightImperialSlider valueCm={d.heightCm} onChange={(cm) => update("heightCm", cm)} />
        ) : (
          <Slider label="Height" value={d.heightCm} min={140} max={220} suffix="cm" onChange={(v) => update("heightCm", v)} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {imperial ? (
            <>
              <WeightImperialSlider label="Current weight" valueKg={d.currentWeightKg} onChange={(kg) => update("currentWeightKg", kg)} />
              <WeightImperialSlider label="Goal weight" valueKg={d.goalWeightKg} onChange={(kg) => update("goalWeightKg", kg)} />
            </>
          ) : (
            <>
              <Slider label="Current weight" value={d.currentWeightKg} min={40} max={180} suffix="kg" onChange={(v) => update("currentWeightKg", v)} />
              <Slider label="Goal weight" value={d.goalWeightKg} min={40} max={180} suffix="kg" onChange={(v) => update("goalWeightKg", v)} />
            </>
          )}
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Gender</div>
          <div className="grid grid-cols-3 gap-2">
            {(["female", "male", "other"] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => update("gender", g)}
                className={cn(
                  "h-12 rounded-2xl capitalize text-sm font-semibold border transition",
                  d.gender === g ? "border-neon bg-neon/10 text-neon" : "border-white/[0.06] bg-white/[0.03]"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label, value, min, max, suffix, onChange,
}: { label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-lg font-extrabold tabular-nums">
          {value}<span className="text-xs text-muted-foreground ml-1">{suffix}</span>
        </span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-neon)]"
      />
    </div>
  );
}

function HeightImperialSlider({ valueCm, onChange }: { valueCm: number; onChange: (cm: number) => void }) {
  const totalInches = Math.round(valueCm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Height</span>
        <span className="text-lg font-extrabold tabular-nums">
          {ft}'{inches}"<span className="text-xs text-muted-foreground ml-2">{totalInches} in</span>
        </span>
      </div>
      <input
        type="range" min={55} max={87} value={totalInches}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 2.54))}
        className="w-full accent-[var(--color-neon)]"
      />
    </div>
  );
}

function WeightImperialSlider({ label, valueKg, onChange }: { label: string; valueKg: number; onChange: (kg: number) => void }) {
  const lb = Math.round(valueKg * 2.20462);
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-lg font-extrabold tabular-nums">
          {lb}<span className="text-xs text-muted-foreground ml-1">lb</span>
        </span>
      </div>
      <input
        type="range" min={88} max={400} value={lb}
        onChange={(e) => onChange(Number(e.target.value) / 2.20462)}
        className="w-full accent-[var(--color-neon)]"
      />
    </div>
  );
}


function NutritionStep({ value, onChange }: { value: NutritionPlan; onChange: (v: NutritionPlan) => void }) {
  const items: { id: NutritionPlan; sub: string; icon: typeof Flame }[] = [
    { id: "fat_loss", icon: Flame, sub: "Calorie deficit, high protein" },
    { id: "muscle_gain", icon: Dumbbell, sub: "Calorie surplus, high protein" },
    { id: "maintenance", icon: Heart, sub: "Eat at maintenance to recomp slowly" },
    { id: "custom", icon: Sparkles, sub: "Set your own targets in Profile" },
  ];
  return (
    <div>
      <StepHeader title="Nutrition approach" sub="We'll generate your calorie and macro targets." />
      <div className="space-y-2.5">
        {items.map(({ id, sub, icon }) => (
          <ChoiceCard key={id} active={value === id} onClick={() => onChange(id)} icon={icon} label={NUTRITION_LABELS[id]} sub={sub} />
        ))}
      </div>
    </div>
  );
}

function ReviewStep({ d }: { d: Draft }) {
  const profile: Profile = { ...d, name: d.name || "Athlete", completedAt: new Date().toISOString() };
  const nutrition = suggestNutrition(profile);
  const plan = workoutRecommendationService.weeklyPlan(profile);
  return (
    <div>
      <StepHeader title={`You're ready, ${d.name || "athlete"}`} sub="Here's the plan we've tailored to your answers." />

      <div className="rounded-3xl border border-neon/30 bg-gradient-to-br from-neon/10 to-transparent p-5">
        <div className="text-[10px] uppercase tracking-wider text-neon font-semibold">Your goal</div>
        <div className="text-xl font-extrabold mt-1">{GOAL_LABELS[d.goal]}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {EXPERIENCE_LABELS[d.experience]} · {EQUIPMENT_LABELS[d.equipment]}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Days / wk" value={String(d.daysPerWeek)} />
        <Stat label="Session" value={`${d.sessionMinutes}m`} />
        <Stat label="Focus" value={String(d.focusAreas.length)} />
      </div>

      <div className="mt-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Daily nutrition</div>
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <Macro label="kcal" value={nutrition.kcal} highlight />
          <Macro label="P (g)" value={nutrition.protein} />
          <Macro label="C (g)" value={nutrition.carbs} />
          <Macro label="F (g)" value={nutrition.fat} />
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white/[0.03] border border-white/[0.05] p-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Weekly split</div>
        <ul className="mt-3 space-y-1.5">
          {plan.map((day) => (
            <li key={day.day} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground w-10">{day.day}</span>
              <span className={cn("font-medium", day.label === "Rest" ? "text-muted-foreground" : "text-foreground")}>
                {day.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
function Macro({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className={cn("text-xl font-extrabold tabular-nums", highlight && "text-neon")}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
