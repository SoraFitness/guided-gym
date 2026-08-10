import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  RotateCcw,
  Play,
  Check,
  Clock,
  Flame,
  Dumbbell,
  Sparkles,
  Layers3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  History,
  Loader2,
  Plus,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  useProfile,
  getProfileGoals,
  GOAL_LABELS,
  FOCUS_LABELS,
  EQUIPMENT_LABELS,
  type EquipmentSetup,
  type FocusArea,
  type Goal,
} from "@/lib/profile";
import {
  getWorkout,
  workoutCatalogSize,
  workoutRecommendationService,
  type Category,
} from "@/lib/workouts";
import {
  weeklyScheduleService,
  toggleCompletion,
  type WeeklyScheduleDay,
} from "@/lib/weeklySchedule";
import {
  WorkoutCardHero,
  WorkoutCardRow,
  WorkoutCardSpotlight,
  WorkoutCardTile,
} from "@/components/WorkoutCard";
import { cn } from "@/lib/utils";
import { getWorkoutSplitOption, WORKOUT_SPLIT_OPTIONS } from "@/lib/workoutSplits";
import { useCompletedWorkouts } from "@/lib/workoutSessionStore";
import { generateWorkoutPlan } from "@/lib/workoutPlan.functions";
import {
  saveWorkoutPlan,
  getActiveWorkoutPlan,
  useSavedWorkoutPlans,
  type SavedWorkoutPlan,
  type WorkoutPlanInput,
} from "@/lib/workoutPlanStore";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Ascendr" }] }),
  component: WorkoutsPage,
});

const TABS = ["Recommended", "Weekly Schedule", "All Workouts"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  Recommended: "For you",
  "Weekly Schedule": "Schedule",
  "All Workouts": "Library",
};

function WorkoutsPage() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>("Recommended");
  const savedPlans = useSavedWorkoutPlans();
  const activePlan = useMemo(
    () => getActiveWorkoutPlan(savedPlans, profile),
    [savedPlans, profile],
  );
  const schedule = useMemo(
    () =>
      profile ? weeklyScheduleService.generateSchedule(profile, activePlan?.workoutIds ?? []) : [],
    [profile, activePlan?.workoutIds],
  );
  const trainingDays = schedule.filter((day) => !day.isRestDay).length;
  const completedDays = schedule.filter((day) => day.isCompleted && !day.isRestDay).length;
  const splitName = profile ? getWorkoutSplitOption(profile.workoutSplit).name : "Smart training";

  return (
    <div className="px-4 pt-5 pb-32 animate-slide-up sm:px-5">
      <header className="flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">Train</p>
          <h1 className="mt-1 text-[29px] font-extrabold leading-tight tracking-[-0.04em]">
            Find your next win.
          </h1>
          {profile && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {splitName} · {GOAL_LABELS[profile.goal]} · {profile.daysPerWeek} days/week
            </p>
          )}
        </div>
        <Link
          to="/workout/history"
          aria-label="Workout history"
          className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/[0.06] bg-surface text-muted-foreground transition active:scale-95"
        >
          <History className="size-5" />
        </Link>
      </header>

      {profile && (
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <TrainingMetric label="This week" value={`${completedDays}/${trainingDays}`} />
          <TrainingMetric label="Session" value={`${profile.sessionMinutes}m`} />
          <TrainingMetric label="Level" value={profile.experience} capitalize />
        </div>
      )}

      {/* Segmented tabs */}
      <div
        data-tour="tour-workouts-tabs"
        className="mt-5 relative grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-surface p-1"
      >
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative h-9 text-[11px] font-semibold rounded-full"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-xl bg-neon"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative",
                  active ? "text-neon-foreground" : "text-muted-foreground",
                )}
              >
                {TAB_LABELS[t]}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          {tab === "Recommended" && <RecommendedView />}
          {tab === "Weekly Schedule" && <WeeklyScheduleView />}
          {tab === "All Workouts" && <AllWorkoutsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TrainingMetric({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.055] bg-white/[0.025] px-3 py-2.5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 truncate text-[12px] font-extrabold", capitalize && "capitalize")}>
        {value}
      </p>
    </div>
  );
}

/* ----------------------------- Recommended ----------------------------- */

function RecommendedView() {
  const { profile } = useProfile();
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const savedPlans = useSavedWorkoutPlans();
  if (!profile) return null;
  const activePlan = getActiveWorkoutPlan(savedPlans, profile);
  const activeIds = new Set(activePlan?.workoutIds ?? []);
  const list = workoutRecommendationService
    .recommend(profile, 14)
    .filter((workout) => !activeIds.has(workout.id));
  const topPick = activePlan?.workoutIds[0] ? getWorkout(activePlan.workoutIds[0]) : list[0];
  const quickPicks = list.slice(activePlan ? 0 : 1, activePlan ? 4 : 5);
  const freshPicks = list.slice(activePlan ? 4 : 5, activePlan ? 9 : 10);

  return (
    <div>
      {activePlan && <SavedPlanSummary plan={activePlan} />}

      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">
            {activePlan ? "Start your plan" : "Best match"}
          </p>
          <h2 className="mt-0.5 text-lg font-extrabold">
            {activePlan ? "Your first session" : "Made for today"}
          </h2>
        </div>
        <span className="text-[9px] text-muted-foreground">
          Ranked from {workoutCatalogSize.toLocaleString()} plans
        </span>
      </div>

      {topPick && <WorkoutCardSpotlight w={topPick} />}

      <button
        type="button"
        onClick={() => setShowPlanBuilder(true)}
        className="mb-4 mt-4 flex w-full items-center gap-3 overflow-hidden rounded-[22px] border border-neon/25 bg-gradient-to-r from-neon/[0.12] via-neon/[0.045] to-transparent p-3.5 text-left transition active:scale-[0.99]"
      >
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-neon text-neon-foreground shadow-[0_0_24px_-8px_var(--color-neon)]">
          <WandSparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon">
            Ascendr AI plan creator
          </p>
          <h2 className="mt-0.5 text-sm font-extrabold">Build a plan around your goal</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Choose your focus, schedule, equipment, and intensity.
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-neon" />
      </button>

      {quickPicks.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon">
                Your training mix
              </p>
              <h2 className="mt-0.5 text-lg font-bold">More picked for you</h2>
            </div>
            <span className="text-[10px] text-muted-foreground">Different focus each session</span>
          </div>
          <div className="space-y-2">
            {quickPicks.map((w) => (
              <WorkoutCardRow key={w.id} w={w} />
            ))}
          </div>
        </section>
      )}

      {freshPicks.length > 0 && (
        <section className="mt-7">
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon">
              Fresh alternatives
            </p>
            <h2 className="mt-0.5 text-lg font-bold">Switch up your routine</h2>
          </div>
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-3 scrollbar-none">
            {freshPicks.map((w) => (
              <WorkoutCardHero key={w.id} w={w} className="w-[220px]" />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {showPlanBuilder && (
          <WorkoutPlanBuilder profile={profile} onClose={() => setShowPlanBuilder(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SavedPlanSummary({ plan }: { plan: SavedWorkoutPlan }) {
  const planWorkouts = plan.workoutIds.map(getWorkout).filter(Boolean);
  return (
    <section className="mb-5 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">
            Your active plan
          </p>
          <h2 className="mt-1 font-extrabold">{plan.name}</h2>
        </div>
        <span className="rounded-full bg-neon/10 px-2 py-1 text-[9px] font-bold uppercase text-neon">
          {plan.source === "ai" ? "AI built" : "Smart match"}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{plan.summary}</p>
      <div className="mt-3 grid gap-2">
        {planWorkouts.slice(0, 3).map((workout, index) =>
          workout ? (
            <Link
              key={workout.id}
              to="/workout/$id"
              params={{ id: workout.id }}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-black/15 px-3 py-2.5"
            >
              <span className="grid size-7 place-items-center rounded-full bg-neon/12 text-[10px] font-black text-neon">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold">{workout.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {workout.duration} min ·{" "}
                  {workout.targetMuscles.map((m) => FOCUS_LABELS[m]).join(" + ")}
                </p>
              </div>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </Link>
          ) : null,
        )}
      </div>
    </section>
  );
}

function WorkoutPlanBuilder({
  profile,
  onClose,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  onClose: () => void;
}) {
  const generate = useServerFn(generateWorkoutPlan);
  const { updateProfile } = useProfile();
  const [input, setInput] = useState<WorkoutPlanInput>({
    goal: profile.goal,
    goals: getProfileGoals(profile),
    experience: profile.experience,
    equipment: profile.equipment,
    focusAreas: profile.focusAreas.length ? profile.focusAreas.slice(0, 3) : ["chest"],
    daysPerWeek: profile.daysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    workoutSplit: profile.workoutSplit ?? "auto",
    notes: profile.injuries ?? "",
  });
  const [result, setResult] = useState<SavedWorkoutPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggleFocus = (focus: FocusArea) => {
    setInput((current) => {
      const selected = current.focusAreas.includes(focus);
      if (selected && current.focusAreas.length === 1) return current;
      return {
        ...current,
        focusAreas: selected
          ? current.focusAreas.filter((item) => item !== focus)
          : [...current.focusAreas, focus].slice(0, 5),
      };
    });
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await generate({ data: input });
      saveWorkoutPlan(response.plan);
      updateProfile({
        goal: input.goal,
        goals: input.goals?.length ? input.goals : [input.goal],
        experience: input.experience,
        equipment: input.equipment,
        focusAreas: input.focusAreas,
        daysPerWeek: input.daysPerWeek,
        sessionMinutes: input.sessionMinutes,
        workoutSplit: input.workoutSplit ?? "auto",
      });
      setResult(response.plan);
    } catch (generationError) {
      console.error("[plan builder]", generationError);
      setError("We couldn't build the plan just yet. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end bg-black/75 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Create an AI workout plan"
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[30px] border border-white/[0.08] bg-background px-5 pb-8 pt-4 sm:max-w-md sm:rounded-[30px]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-neon/15 text-neon">
            <WandSparkles className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
              Ascendr AI
            </p>
            <h2 className="text-xl font-extrabold">Create my workout plan</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-white/[0.06]"
            aria-label="Close plan creator"
          >
            <X className="size-4" />
          </button>
        </div>

        {result ? (
          <div className="mt-6">
            <div className="rounded-[24px] border border-neon/25 bg-neon/[0.07] p-4">
              <div className="flex items-center gap-2 text-neon">
                <Check className="size-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                  Plan saved
                </span>
              </div>
              <h3 className="mt-2 text-xl font-extrabold">{result.name}</h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {result.summary}
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {result.workoutIds.map((id, index) => {
                const workout = getWorkout(id);
                if (!workout) return null;
                return (
                  <Link
                    key={id}
                    to="/workout/$id"
                    params={{ id }}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-neon text-xs font-black text-neon-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{workout.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {workout.duration} min · {workout.exercises.length} exercises
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 h-13 w-full rounded-full bg-neon font-bold text-neon-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <fieldset>
              <legend className="text-sm font-bold">What do you want to train?</legend>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Choose up to five priorities.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(Object.keys(FOCUS_LABELS) as FocusArea[]).map((focus) => (
                  <button
                    key={focus}
                    type="button"
                    onClick={() => toggleFocus(focus)}
                    className={cn(
                      "min-h-10 rounded-xl border px-1 text-[10px] font-semibold transition",
                      input.focusAreas.includes(focus)
                        ? "border-neon bg-neon text-neon-foreground"
                        : "border-white/[0.07] bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    {FOCUS_LABELS[focus]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold">
                Goal
                <select
                  value={input.goal}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      goal: event.target.value as Goal,
                      goals: [event.target.value as Goal],
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 text-xs outline-none"
                >
                  {(Object.keys(GOAL_LABELS) as Goal[]).map((goal) => (
                    <option key={goal} value={goal} className="bg-background">
                      {GOAL_LABELS[goal]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold">
                Equipment
                <select
                  value={input.equipment}
                  onChange={(event) =>
                    setInput((current) => ({
                      ...current,
                      equipment: event.target.value as EquipmentSetup,
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 text-xs outline-none"
                >
                  {(Object.keys(EQUIPMENT_LABELS) as EquipmentSetup[]).map((equipment) => (
                    <option key={equipment} value={equipment} className="bg-background">
                      {EQUIPMENT_LABELS[equipment]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-bold">Training days</legend>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {([2, 3, 4, 5, 6] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setInput((current) => ({ ...current, daysPerWeek: days }))}
                    className={cn(
                      "h-11 rounded-xl border text-xs font-bold",
                      input.daysPerWeek === days
                        ? "border-neon bg-neon/15 text-neon"
                        : "border-white/[0.07] bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold">Session length</legend>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {([20, 30, 45, 60] as const).map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setInput((current) => ({ ...current, sessionMinutes: minutes }))}
                    className={cn(
                      "h-11 rounded-xl border text-xs font-bold",
                      input.sessionMinutes === minutes
                        ? "border-neon bg-neon/15 text-neon"
                        : "border-white/[0.07] bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-bold">
              Anything Ascendr should know?{" "}
              <span className="font-normal text-muted-foreground">Optional</span>
              <textarea
                value={input.notes ?? ""}
                onChange={(event) =>
                  setInput((current) => ({ ...current, notes: event.target.value.slice(0, 300) }))
                }
                rows={3}
                placeholder="Example: Avoid overhead pressing, prefer machines, want more glute work..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 text-sm font-normal outline-none focus:border-neon/50"
              />
            </label>

            {error && <p className="text-center text-xs text-red-300">{error}</p>}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-neon text-sm font-bold text-neon-foreground disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <WandSparkles className="size-5" />
              )}
              {busy ? "Building your plan..." : "Create my plan"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ----------------------------- All Workouts ----------------------------- */

const categoryChips = ["All", "Strength", "HIIT", "Cardio", "Core", "Mobility"] as const;
type CatChip = (typeof categoryChips)[number];

function AllWorkoutsView() {
  const { profile } = useProfile();
  const [chip, setChip] = useState<CatChip>("All");
  const [q, setQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(40);

  const list = useMemo(() => {
    if (!profile) return [];
    const cat: Category | "All" = chip;
    const items = workoutRecommendationService.filterByCategory(profile, cat);
    return q ? items.filter((w) => w.title.toLowerCase().includes(q.toLowerCase())) : items;
  }, [profile, chip, q]);

  useEffect(() => {
    setVisibleCount(40);
  }, [chip, q, profile?.equipment, profile?.experience]);

  const visible = list.slice(0, visibleCount);

  return (
    <div>
      <label className="flex items-center gap-3 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search workouts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
        />
      </label>
      <div className="-mx-5 px-5 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categoryChips.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full text-xs font-semibold border transition",
              chip === c
                ? "bg-neon text-neon-foreground border-neon"
                : "bg-white/[0.04] border-white/[0.06] text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{list.length.toLocaleString()} plans match your profile</span>
        <span>Showing {Math.min(visible.length, list.length).toLocaleString()}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {visible.map((w) => (
          <WorkoutCardTile key={w.id} w={w} />
        ))}
      </div>
      {visible.length < list.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((count) => count + 40)}
          className="mt-5 h-12 w-full rounded-full border border-white/[0.08] bg-white/[0.04] text-sm font-semibold"
        >
          Load 40 more
        </button>
      )}
      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-sm">No workouts match.</p>
      )}
    </div>
  );
}

/* ----------------------------- Weekly Schedule ----------------------------- */

function WeeklyScheduleView() {
  const { profile, updateProfile } = useProfile();
  const completedWorkouts = useCompletedWorkouts();
  const savedPlans = useSavedWorkoutPlans();
  const activePlan = useMemo(
    () => getActiveWorkoutPlan(savedPlans, profile),
    [savedPlans, profile],
  );
  const [schedule, setSchedule] = useState<WeeklyScheduleDay[]>(() =>
    profile ? weeklyScheduleService.generateSchedule(profile, activePlan?.workoutIds ?? []) : [],
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showSplits, setShowSplits] = useState(false);
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [activeDayIndex, setActiveDayIndex] = useState(() => {
    const todayIndex = schedule.findIndex((day) => day.isToday);
    return todayIndex >= 0 ? todayIndex : 0;
  });

  useEffect(() => {
    if (profile) {
      const nextSchedule = weeklyScheduleService.generateSchedule(
        profile,
        activePlan?.workoutIds ?? [],
      );
      setSchedule(nextSchedule);
      const todayIndex = nextSchedule.findIndex((day) => day.isToday);
      setActiveDayIndex(todayIndex >= 0 ? todayIndex : 0);
    }
  }, [profile, activePlan?.workoutIds]);

  if (!profile) return null;

  const selectedSplit = getWorkoutSplitOption(profile.workoutSplit);

  const selectSplit = (splitId: (typeof WORKOUT_SPLIT_OPTIONS)[number]["id"]) => {
    const nextProfile = { ...profile, workoutSplit: splitId };
    updateProfile({ workoutSplit: splitId });
    setSchedule(weeklyScheduleService.generateSchedule(nextProfile));
    setShowSplits(false);
    setToast(`${getWorkoutSplitOption(splitId).name} selected`);
    setTimeout(() => setToast(null), 1800);
  };

  const rebuild = () => {
    setSchedule(weeklyScheduleService.generateSchedule(profile, activePlan?.workoutIds ?? []));
    setToast("Weekly plan rebuilt");
    setTimeout(() => setToast(null), 1800);
  };

  const onToggle = (id: string) => {
    const next = toggleCompletion(id);
    setSchedule((cur) => cur.map((d) => ({ ...d, isCompleted: !!next.completed[d.id] })));
  };

  const trainingDays = schedule.filter((d) => !d.isRestDay).length;
  const completedDays = schedule.filter((d) => d.isCompleted && !d.isRestDay).length;

  return (
    <div>
      <section className="mb-4 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.03]">
        <button
          type="button"
          onClick={() => setShowSplits((open) => !open)}
          className="flex w-full items-center gap-3 p-4 text-left"
          aria-expanded={showSplits}
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-neon/15 text-neon">
            <Layers3 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
              Workout split
            </p>
            <p className="mt-0.5 font-bold">{selectedSplit.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {selectedSplit.bestFor}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              showSplits && "rotate-180",
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {showSplits && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3">
                {WORKOUT_SPLIT_OPTIONS.map((option) => {
                  const selected = option.id === (profile.workoutSplit ?? "auto");
                  const idealForSchedule = option.recommendedDays.includes(profile.daysPerWeek);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectSplit(option.id)}
                      className={cn(
                        "relative min-h-28 rounded-[18px] border p-3 text-left transition",
                        selected
                          ? "border-neon/60 bg-neon/10"
                          : "border-white/[0.06] bg-black/15 active:bg-white/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[12px] font-bold leading-tight">{option.shortName}</p>
                        {selected && <Check className="size-3.5 shrink-0 text-neon" />}
                      </div>
                      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-neon">
                        {option.badge}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                        {option.description}
                      </p>
                      {!idealForSchedule && option.id !== "auto" && (
                        <p className="mt-1.5 text-[9px] text-amber-300/80">
                          Adapts to your {profile.daysPerWeek}-day week
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div
        data-tour="tour-workouts-plan"
        className="rounded-[24px] bg-gradient-to-br from-neon/15 to-transparent border border-white/[0.06] p-4 flex items-center gap-4"
      >
        <div className="size-12 rounded-2xl bg-neon/20 grid place-items-center">
          <Sparkles className="size-5 text-neon" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Your weekly plan</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {completedDays}/{trainingDays} sessions complete · {profile.daysPerWeek} days/wk
          </div>
        </div>
        <button
          onClick={rebuild}
          className="h-10 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition"
        >
          <RotateCcw className="size-3.5" /> Rebuild
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 text-center text-[11px] text-neon font-semibold"
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-2 rounded-full border border-white/[0.06] bg-white/[0.035] p-1">
        {(["week", "month"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setCalendarMode(mode)}
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded-full text-[11px] font-semibold transition",
              calendarMode === mode ? "bg-neon text-neon-foreground" : "text-muted-foreground",
            )}
          >
            {mode === "week" ? (
              <Layers3 className="size-3.5" />
            ) : (
              <CalendarDays className="size-3.5" />
            )}
            {mode === "week" ? "Week" : "Month"}
          </button>
        ))}
      </div>

      {calendarMode === "week" ? (
        <DailyScheduleCarousel
          schedule={schedule}
          activeIndex={activeDayIndex}
          onActiveIndexChange={setActiveDayIndex}
          onToggle={onToggle}
        />
      ) : (
        <MonthlyTrainingCalendar
          schedule={schedule}
          completedWorkouts={completedWorkouts}
          onChooseScheduledDay={(index) => {
            setActiveDayIndex(index);
            setCalendarMode("week");
          }}
        />
      )}
    </div>
  );
}

function localDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function MonthlyTrainingCalendar({
  schedule,
  completedWorkouts,
  onChooseScheduledDay,
}: {
  schedule: WeeklyScheduleDay[];
  completedWorkouts: ReturnType<typeof useCompletedWorkouts>;
  onChooseScheduledDay: (index: number) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const plannedByDate = new Map(schedule.map((day, index) => [day.dateISO, { day, index }]));
  const completedByDate = useMemo(() => {
    const map = new Map<string, number>();
    completedWorkouts.forEach((workout) => {
      const key = localDateISO(new Date(workout.completedAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [completedWorkouts]);
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayOffset);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const monthKey = `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}`;
  const completedThisMonth = [...completedByDate.entries()]
    .filter(([date]) => date.startsWith(monthKey))
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <section className="mt-4 rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
          }
          className="grid size-9 place-items-center rounded-full bg-white/[0.05]"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <p className="font-extrabold">
            {visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {completedThisMonth} workout{completedThisMonth === 1 ? "" : "s"} completed
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
          }
          className="grid size-9 place-items-center rounded-full bg-white/[0.05]"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const dateISO = localDateISO(date);
          const planned = plannedByDate.get(dateISO);
          const completedCount = completedByDate.get(dateISO) ?? 0;
          const outside = date.getMonth() !== visibleMonth.getMonth();
          const today = dateISO === localDateISO(new Date());
          return (
            <button
              key={dateISO}
              type="button"
              disabled={!planned}
              onClick={() => planned && onChooseScheduledDay(planned.index)}
              aria-label={`${date.toLocaleDateString()}${completedCount ? `, ${completedCount} completed workout` : ""}${planned && !planned.day.isRestDay ? ", workout planned" : ""}`}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[11px] font-semibold tabular-nums",
                outside && "opacity-25",
                today ? "border-neon/60 text-neon" : "border-transparent",
                planned && !planned.day.isRestDay && "bg-neon/[0.07]",
                completedCount > 0 && "bg-emerald-400/[0.09] text-emerald-200",
              )}
            >
              {date.getDate()}
              <span className="absolute bottom-1 flex gap-0.5">
                {planned && !planned.day.isRestDay && (
                  <span className="size-1 rounded-full bg-neon" />
                )}
                {completedCount > 0 && <span className="size-1 rounded-full bg-emerald-300" />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-neon" /> Planned
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-300" /> Completed
          </span>
        </div>
        <Link
          to="/workout/history"
          className="flex items-center gap-1 text-[10px] font-bold text-neon"
        >
          <History className="size-3" /> Full history
        </Link>
      </div>
    </section>
  );
}

function DailyScheduleCarousel({
  schedule,
  activeIndex,
  onActiveIndexChange,
  onToggle,
}: {
  schedule: WeeklyScheduleDay[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onToggle: (id: string) => void;
}) {
  const [direction, setDirection] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selectedDay = schedule[activeIndex];
  const todayIndex = schedule.findIndex((day) => day.isToday);

  if (!selectedDay) return null;

  const moveTo = (nextIndex: number) => {
    const bounded = Math.max(0, Math.min(schedule.length - 1, nextIndex));
    if (bounded === activeIndex) return;
    setDirection(bounded > activeIndex ? 1 : -1);
    onActiveIndexChange(bounded);
  };

  const relativeLabel =
    activeIndex === todayIndex
      ? "Today's workout"
      : activeIndex === todayIndex - 1
        ? "Yesterday"
        : activeIndex === todayIndex + 1
          ? "Tomorrow"
          : new Date(`${selectedDay.dateISO}T12:00:00`).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

  return (
    <section
      className="mt-4"
      tabIndex={0}
      aria-label="Daily workout schedule"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") moveTo(activeIndex - 1);
        if (event.key === "ArrowRight") moveTo(activeIndex + 1);
      }}
    >
      <div className="grid grid-cols-7 gap-1.5" aria-label="Choose a workout day">
        {schedule.map((day, index) => {
          const selected = index === activeIndex;
          const dateNumber = new Date(`${day.dateISO}T12:00:00`).getDate();
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => moveTo(index)}
              aria-current={selected ? "date" : undefined}
              aria-label={`${day.dayName}, ${day.dateISO}${day.isToday ? ", today" : ""}`}
              className={cn(
                "relative flex min-w-0 flex-col items-center rounded-2xl border py-2.5 transition",
                selected
                  ? "border-neon bg-neon text-neon-foreground shadow-[0_0_18px_-8px_var(--neon)]"
                  : day.isToday
                    ? "border-neon/35 bg-neon/[0.08] text-neon"
                    : "border-white/[0.06] bg-white/[0.025] text-muted-foreground",
              )}
            >
              <span className="text-[8px] font-bold uppercase tracking-wide">
                {day.dayName.slice(0, 3)}
              </span>
              <span className="mt-1 text-sm font-black leading-none tabular-nums">
                {dateNumber}
              </span>
              <span
                className={cn(
                  "mt-1.5 size-1 rounded-full",
                  selected
                    ? "bg-neon-foreground"
                    : day.isCompleted
                      ? "bg-emerald-300"
                      : day.isRestDay
                        ? "bg-white/20"
                        : "bg-neon/70",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <button
          type="button"
          onClick={() => moveTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous day"
          className="grid size-9 place-items-center rounded-full border border-white/[0.07] bg-white/[0.035] disabled:opacity-25"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 text-center" aria-live="polite">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon">
            {relativeLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {selectedDay.dayName} · Swipe to change days
          </p>
        </div>
        <button
          type="button"
          onClick={() => moveTo(activeIndex + 1)}
          disabled={activeIndex === schedule.length - 1}
          aria-label="Next day"
          className="grid size-9 place-items-center rounded-full border border-white/[0.07] bg-white/[0.035] disabled:opacity-25"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-2 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={selectedDay.id}
            custom={direction}
            variants={{
              enter: (slideDirection: number) => ({
                opacity: 0,
                x: slideDirection >= 0 ? 34 : -34,
              }),
              center: { opacity: 1, x: 0 },
              exit: (slideDirection: number) => ({
                opacity: 0,
                x: slideDirection >= 0 ? -34 : 34,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: "easeOut" }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              const touch = event.changedTouches[0];
              touchStart.current = null;
              if (!start || !touch) return;
              const deltaX = touch.clientX - start.x;
              const deltaY = touch.clientY - start.y;
              if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
              moveTo(deltaX < 0 ? activeIndex + 1 : activeIndex - 1);
            }}
          >
            {selectedDay.isRestDay ? (
              <RestDayCard day={selectedDay} />
            ) : (
              <TrainingDayCard day={selectedDay} onToggle={onToggle} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function StatusBadge({ day }: { day: WeeklyScheduleDay }) {
  if (day.isCompleted) {
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center gap-1">
        <Check className="size-3" /> Done
      </span>
    );
  }
  if (day.isToday) {
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-neon text-neon-foreground">
        Today
      </span>
    );
  }
  const isPast = new Date(`${day.dateISO}T23:59:59`).getTime() < Date.now();
  return (
    <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-white/[0.05] text-muted-foreground">
      {isPast ? "Previous" : "Upcoming"}
    </span>
  );
}

function TrainingDayCard({
  day,
  onToggle,
}: {
  day: WeeklyScheduleDay;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-5 transition",
        day.isToday
          ? "bg-gradient-to-br from-neon/10 via-white/[0.03] to-white/[0.02] border-neon/40"
          : "bg-white/[0.03] border-white/[0.06]",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {day.dayName}
          </div>
          <h3 className="mt-0.5 text-xl font-extrabold leading-tight">{day.workoutTitle}</h3>
        </div>
        <StatusBadge day={day} />
      </div>

      <p className="mt-1 text-[12px] text-muted-foreground">{day.focus}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
        <Pill icon={Clock}>{day.duration} min</Pill>
        <Pill icon={Dumbbell}>{day.difficulty}</Pill>
        <Pill icon={Flame}>{day.estimatedCalories} kcal</Pill>
        <span className="px-2 py-1 rounded-full bg-white/[0.05] text-muted-foreground">
          {day.equipment}
        </span>
      </div>

      {day.exercises.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {day.exercises.slice(0, 4).map((ex) => (
            <span
              key={ex}
              className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.05]"
            >
              {ex}
            </span>
          ))}
          {day.exercises.length > 4 && (
            <span className="text-[10px] px-2 py-1 rounded-md text-muted-foreground">
              +{day.exercises.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {day.workoutId ? (
          <Link
            to="/workout/$id/session"
            params={{ id: day.workoutId }}
            className="flex-1 h-11 rounded-full bg-neon text-neon-foreground font-semibold text-[13px] flex items-center justify-center gap-1.5 glow-neon active:scale-[0.98] transition"
          >
            <Play className="size-4 fill-current" /> Start
          </Link>
        ) : (
          <button
            disabled
            className="flex-1 h-11 rounded-full bg-white/[0.05] text-muted-foreground font-semibold text-[13px]"
          >
            No match
          </button>
        )}
        {day.workoutId && (
          <Link
            to="/workout/$id"
            params={{ id: day.workoutId }}
            className="h-11 px-4 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center"
          >
            Details
          </Link>
        )}
        <button
          onClick={() => onToggle(day.id)}
          aria-label="Mark complete"
          className={cn(
            "size-11 rounded-full grid place-items-center border transition",
            day.isCompleted
              ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-300"
              : "bg-white/[0.04] border-white/[0.06] text-muted-foreground",
          )}
        >
          <Check className="size-4" />
        </button>
      </div>
    </div>
  );
}

function RestDayCard({ day }: { day: WeeklyScheduleDay }) {
  return (
    <div className="rounded-[24px] border border-white/[0.04] bg-white/[0.015] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {day.dayName}
          </div>
          <h3 className="mt-0.5 text-lg font-bold text-muted-foreground">Rest & Recovery</h3>
        </div>
        {day.isToday && (
          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-neon text-neon-foreground">
            Today
          </span>
        )}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">Stretch, walk, hydrate, and recover.</p>
      <Link
        to="/workout/$id"
        params={{ id: "mobility-recovery" }}
        className="mt-3 inline-flex h-9 px-4 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-semibold items-center"
      >
        Mobility Session
      </Link>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-full bg-white/[0.05] flex items-center gap-1 tabular-nums">
      <Icon className="size-3" />
      {children}
    </span>
  );
}
