import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Home,
  RotateCcw,
  SkipForward,
  X,
  Timer,
  Plus,
  Minus,
  StickyNote,
  Trash2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Flame,
  Dumbbell,
  History as HistoryIcon,
} from "lucide-react";
import { getWorkout, type Workout } from "@/lib/workouts";
import { useProfile } from "@/lib/profile";
import {
  addExtraSet,
  clearSession,
  completeSetInSession,
  computeSummary,
  removeSet,
  restartSession,
  saveCompletedWorkout,
  setExerciseNotes,
  setSessionUnit,
  startSession,
  updateSession,
  updateSet,
  useActiveSession,
  type CompletedWorkout,
  type ExerciseLog,
  type SetLog,
  type WeightUnit,
  type WorkoutSession as _WS,
} from "@/lib/workoutSessionStore";
import { logWorkout } from "@/lib/progressStore";
import { Exercise3DViewer } from "@/components/exercise3d/Exercise3DViewer";
import { detectAnimation } from "@/lib/exerciseCoaching";
import type { AvatarGender } from "@/components/exercise3d/AvatarModel";

export const Route = createFileRoute("/workout/$id/session")({
  head: ({ params }) => ({
    meta: [{ title: `${getWorkout(params.id)?.title ?? "Workout"} — Session` }],
  }),
  loader: ({ params }) => {
    const w = getWorkout(params.id);
    if (!w) throw notFound();
    return w;
  },
  component: SessionPage,
});

function genderToAvatar(g: string | undefined): AvatarGender {
  if (g === "male" || g === "female") return g;
  return "neutral";
}

function parseRest(rest: string | undefined): number {
  if (!rest) return 45;
  const m = rest.trim().toLowerCase().match(/^(\d+)\s*([sm]?)$/);
  if (!m) return 45;
  const n = parseInt(m[1], 10);
  return m[2] === "m" ? n * 60 : n;
}

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Phase = "exercise" | "rest" | "complete";

function SessionPage() {
  const w = Route.useLoaderData() as Workout;
  const navigate = useNavigate();
  const { profile } = useProfile();

  // Seed session synchronously so first render has data.
  useState(() => {
    if (typeof window === "undefined") return null;
    return startSession(
      w.id,
      w.title,
      w.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        muscleGroup: e.muscleGroup,
      })),
    );
  });
  const session = useActiveSession();

  const [phase, setPhase] = useState<Phase>("exercise");
  const [restTotal, setRestTotal] = useState(45);
  const [restLeft, setRestLeft] = useState(45);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const restTimer = useRef<number | null>(null);

  const activeForThis =
    session && session.workoutId === w.id && session.status === "active" ? session : null;
  const idx = activeForThis ? Math.min(activeForThis.currentExerciseIndex, w.exercises.length - 1) : 0;
  const ex = w.exercises[idx];
  const exLog = activeForThis?.exercises[idx];

  const summary = useMemo(
    () =>
      activeForThis
        ? computeSummary({ exercises: activeForThis.exercises, unit: activeForThis.unit })
        : { totalSets: 0, totalReps: 0, totalVolume: 0, exercisesCompleted: 0 },
    [activeForThis],
  );
  const plannedTotal = useMemo(() => w.exercises.reduce((s, e) => s + e.sets, 0), [w]);
  const progressPct = plannedTotal ? Math.min(100, (summary.totalSets / plannedTotal) * 100) : 0;

  const animation = detectAnimation(ex.name, ex.demoType);
  const gender = genderToAvatar(profile?.gender);

  // ----- rest timer -----
  const startRest = useCallback((seconds: number) => {
    setRestTotal(seconds);
    setRestLeft(seconds);
    setPhase("rest");
  }, []);

  useEffect(() => {
    if (phase !== "rest") {
      if (restTimer.current) {
        window.clearInterval(restTimer.current);
        restTimer.current = null;
      }
      return;
    }
    restTimer.current = window.setInterval(() => {
      setRestLeft((r) => {
        if (r <= 1) {
          window.clearInterval(restTimer.current!);
          restTimer.current = null;
          setPhase("exercise");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (restTimer.current) window.clearInterval(restTimer.current);
      restTimer.current = null;
    };
  }, [phase]);

  // ----- finalize -----
  const finalize = useCallback(() => {
    if (!session) return;
    const startedAt = new Date(session.startedAt).getTime();
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const sum = computeSummary({ exercises: session.exercises, unit: session.unit });
    const completion = plannedTotal ? Math.min(1, sum.totalSets / plannedTotal) : 1;
    const calories = Math.round(w.calories * Math.max(0.3, completion));
    const completed: CompletedWorkout = {
      id: crypto.randomUUID(),
      workoutId: w.id,
      workoutTitle: w.title,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
      durationMin,
      calories,
      unit: session.unit,
      exercises: session.exercises,
      totalSets: sum.totalSets,
      totalReps: sum.totalReps,
      totalVolume: sum.totalVolume,
      bestSet: sum.bestSet,
      notes: session.notes,
    };
    saveCompletedWorkout(completed);
    logWorkout(durationMin, w.id);
    setSavedWorkoutId(completed.id);
    clearSession();
    setPhase("complete");
  }, [session, plannedTotal, w]);

  // ----- actions -----
  const handleCompleteSet = (setNumber: number) => {
    if (!exLog) return;
    completeSetInSession(exLog.id, setNumber);
    startRest(parseRest(ex.rest));
  };

  const handleNextExercise = () => {
    if (!session) return;
    if (idx + 1 >= w.exercises.length) {
      finalize();
      return;
    }
    updateSession({ currentExerciseIndex: idx + 1 });
    setPhase("exercise");
  };

  const handleEndWorkout = () => {
    if (confirm("End this workout? We'll save what you've completed so far.")) {
      finalize();
    }
  };

  const handleExit = () => {
    if (confirm("Exit without saving this session?")) {
      clearSession();
      navigate({ to: "/workout/$id", params: { id: w.id } });
    }
  };

  if (phase === "complete") {
    return <CompletionScreen workout={w} savedId={savedWorkoutId} />;
  }

  if (!activeForThis || !exLog) {
    return <div className="min-h-dvh grid place-items-center text-muted-foreground">Loading…</div>;
  }

  const completedCount = exLog.sets.filter((s) => s.completed).length;
  const nextIncomplete = exLog.sets.find((s) => !s.completed);
  const nextEx = w.exercises[Math.min(idx + 1, w.exercises.length - 1)];

  return (
    <div className="min-h-dvh bg-background flex flex-col pb-32">
      {/* header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button
          onClick={handleExit}
          className="size-10 rounded-full bg-white/[0.06] grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground">
            Exercise {idx + 1} of {w.exercises.length}
          </div>
          <div className="font-bold truncate">{w.title}</div>
        </div>
        <UnitToggle unit={activeForThis.unit} onChange={setSessionUnit} />
      </div>

      {/* progress bar */}
      <div className="px-5">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full bg-neon"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground tabular-nums">
          {summary.totalSets}/{plannedTotal} planned sets · {summary.totalReps} reps
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "exercise" ? (
          <motion.div
            key={`ex-${ex.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex-1 flex flex-col"
          >
            {/* exercise hero */}
            <div className="px-5 mt-4">
              <h1 className="text-2xl font-extrabold leading-tight">{ex.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <Chip className="bg-white/10 font-bold px-2.5 py-1">
                  {ex.reps ? `${ex.reps} reps` : ex.time}
                </Chip>
                <Chip>{ex.muscleGroup}</Chip>
                <Chip>{ex.difficulty}</Chip>
                <Chip>Rest {ex.rest}</Chip>
                {exLog.isBodyweight && <Chip className="bg-neon/15 text-neon">Bodyweight</Chip>}
              </div>
            </div>

            {/* 3D viewer */}
            <div className="px-5 mt-4">
              <Exercise3DViewer
                animation={animation}
                gender={gender}
                showControls={false}
                label={ex.name}
              />
            </div>

            {/* set tracker */}
            <SetTracker
              exLog={exLog}
              unit={activeForThis.unit}
              onComplete={handleCompleteSet}
              onAddSet={() => addExtraSet(exLog.id)}
            />

            {/* actions */}
            <div className="px-5 mt-5 flex flex-col gap-2">
              <button
                onClick={() => nextIncomplete && handleCompleteSet(nextIncomplete.setNumber)}
                disabled={!nextIncomplete}
                className="w-full h-14 rounded-full bg-neon text-neon-foreground font-bold text-base glow-neon active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Check className="size-5" />
                {nextIncomplete ? `Complete Set ${nextIncomplete.setNumber}` : "All sets done"}
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => startRest(parseRest(ex.rest))}
                  className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Timer className="size-4" /> Rest
                </button>
                <button
                  onClick={handleNextExercise}
                  className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <SkipForward className="size-4" />
                  {idx + 1 >= w.exercises.length ? "Finish" : "Next"}
                </button>
                <button
                  onClick={handleEndWorkout}
                  className="h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <X className="size-4" /> End
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground text-center pt-1">
                Completed {completedCount} of {exLog.sets.length} sets ·{" "}
                {completedCount > exLog.sets.length - 1 || exLog.sets.some((s) => s.isExtraSet)
                  ? "extra sets included"
                  : "tap + Add Set for more"}
              </div>
            </div>
          </motion.div>
        ) : (
          <RestScreen
            key="rest"
            restLeft={restLeft}
            restTotal={restTotal}
            nextName={nextIncomplete ? ex.name : nextEx.name}
            nextSet={nextIncomplete?.setNumber ?? 1}
            nextSetsTotal={nextIncomplete ? exLog.sets.length : nextEx.sets}
            nextReps={
              nextIncomplete
                ? `${nextIncomplete.actualReps} reps`
                : nextEx.reps
                  ? `${nextEx.reps} reps`
                  : nextEx.time ?? ""
            }
            isNextExercise={!nextIncomplete}
            onAdjust={(d) => setRestLeft((r) => Math.max(5, r + d))}
            onSkip={() => {
              if (!nextIncomplete) handleNextExercise();
              else setPhase("exercise");
            }}
            onEnd={handleEndWorkout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================= Set tracker ============================= */

function SetTracker({
  exLog,
  unit,
  onComplete,
  onAddSet,
}: {
  exLog: ExerciseLog;
  unit: WeightUnit;
  onComplete: (setNumber: number) => void;
  onAddSet: () => void;
}) {
  const [openNotesFor, setOpenNotesFor] = useState<number | null>(null);

  return (
    <div className="px-5 mt-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">Sets</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {exLog.sets.filter((s) => s.completed).length}/{exLog.sets.length} done
        </span>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[28px_1fr_1fr_36px_36px] gap-2 px-2 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>#</span>
        <span>Reps</span>
        <span>Weight ({unit})</span>
        <span className="text-center">Notes</span>
        <span className="text-center">Done</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {exLog.sets.map((s) => (
          <SetRow
            key={s.setNumber}
            exLog={exLog}
            set={s}
            unit={unit}
            onComplete={() => onComplete(s.setNumber)}
            onOpenNotes={() => setOpenNotesFor((cur) => (cur === s.setNumber ? null : s.setNumber))}
            isNotesOpen={openNotesFor === s.setNumber}
          />
        ))}
      </div>

      <button
        onClick={onAddSet}
        className="mt-2 w-full h-11 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-[12px] font-semibold flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-neon/40 transition"
      >
        <Plus className="size-4" /> Add Set
      </button>
    </div>
  );
}

function SetRow({
  exLog,
  set,
  unit,
  onComplete,
  onOpenNotes,
  isNotesOpen,
}: {
  exLog: ExerciseLog;
  set: SetLog;
  unit: WeightUnit;
  onComplete: () => void;
  onOpenNotes: () => void;
  isNotesOpen: boolean;
}) {
  const bumpReps = (d: number) =>
    updateSet(exLog.id, set.setNumber, { actualReps: Math.max(0, set.actualReps + d) });
  const bumpWeight = (d: number) =>
    updateSet(exLog.id, set.setNumber, { weight: Math.max(0, Math.round((set.weight + d) * 10) / 10) });
  const weightStep = unit === "kg" ? 2.5 : 5;

  return (
    <div
      className={
        "rounded-2xl border " +
        (set.completed
          ? "bg-neon/10 border-neon/30"
          : "bg-white/[0.03] border-white/[0.05]")
      }
    >
      <div className="grid grid-cols-[28px_1fr_1fr_36px_36px] gap-2 items-center p-2">
        <div className="text-center text-[11px] font-bold tabular-nums">
          {set.setNumber}
          {set.isExtraSet && <div className="text-[8px] text-neon font-bold">+1</div>}
        </div>

        {/* reps */}
        <div className="flex items-center bg-background/60 rounded-xl h-10 px-1">
          <button
            onClick={() => bumpReps(-1)}
            className="size-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.06]"
            aria-label="Decrease reps"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="number"
            inputMode="numeric"
            value={set.actualReps}
            onChange={(e) =>
              updateSet(exLog.id, set.setNumber, {
                actualReps: Math.max(0, parseInt(e.target.value || "0", 10)),
              })
            }
            className="flex-1 bg-transparent outline-none text-center text-sm font-bold tabular-nums w-full"
          />
          <button
            onClick={() => bumpReps(1)}
            className="size-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.06]"
            aria-label="Increase reps"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* weight */}
        <div className="flex items-center bg-background/60 rounded-xl h-10 px-1">
          <button
            onClick={() => bumpWeight(-weightStep)}
            className="size-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.06]"
            aria-label="Decrease weight"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="number"
            inputMode="decimal"
            value={set.weight || ""}
            placeholder={exLog.isBodyweight ? "BW" : "0"}
            onChange={(e) =>
              updateSet(exLog.id, set.setNumber, {
                weight: Math.max(0, parseFloat(e.target.value) || 0),
              })
            }
            className="flex-1 bg-transparent outline-none text-center text-sm font-bold tabular-nums w-full"
          />
          <button
            onClick={() => bumpWeight(weightStep)}
            className="size-7 grid place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.06]"
            aria-label="Increase weight"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* notes */}
        <button
          onClick={onOpenNotes}
          aria-label="Set notes"
          className={
            "size-9 rounded-xl grid place-items-center transition " +
            (set.notes ? "bg-neon/20 text-neon" : "bg-white/[0.04] text-muted-foreground")
          }
        >
          <StickyNote className="size-4" />
        </button>

        {/* done */}
        <button
          onClick={onComplete}
          aria-label="Mark set complete"
          className={
            "size-9 rounded-xl grid place-items-center transition " +
            (set.completed
              ? "bg-neon text-neon-foreground"
              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]")
          }
        >
          <Check className="size-4" />
        </button>
      </div>

      {isNotesOpen && (
        <div className="px-2 pb-2 flex gap-2">
          <input
            type="text"
            value={set.notes ?? ""}
            placeholder="Form, RPE, tempo…"
            maxLength={140}
            onChange={(e) => updateSet(exLog.id, set.setNumber, { notes: e.target.value })}
            className="flex-1 h-10 rounded-xl bg-background/60 px-3 text-sm outline-none"
          />
          {exLog.sets.length > 1 && (
            <button
              onClick={() => removeSet(exLog.id, set.setNumber)}
              aria-label="Delete set"
              className="size-10 grid place-items-center rounded-xl bg-red-500/10 text-red-300"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function UnitToggle({
  unit,
  onChange,
}: {
  unit: WeightUnit;
  onChange: (u: WeightUnit) => void;
}) {
  return (
    <div className="flex bg-white/[0.05] rounded-full p-0.5 text-[10px] font-bold">
      {(["lb", "kg"] as const).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={
            "px-2.5 h-7 rounded-full " +
            (unit === u ? "bg-neon text-neon-foreground" : "text-muted-foreground")
          }
        >
          {u}
        </button>
      ))}
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={
        "px-2 py-1 rounded-full bg-white/[0.06] text-[11px] font-medium " + (className ?? "")
      }
    >
      {children}
    </span>
  );
}

/* ============================= Rest screen ============================= */

function RestScreen({
  restLeft,
  restTotal,
  nextName,
  nextSet,
  nextSetsTotal,
  nextReps,
  isNextExercise,
  onAdjust,
  onSkip,
  onEnd,
}: {
  restLeft: number;
  restTotal: number;
  nextName: string;
  nextSet: number;
  nextSetsTotal: number;
  nextReps: string;
  isNextExercise: boolean;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
  onEnd: () => void;
}) {
  const pct = restTotal > 0 ? restLeft / restTotal : 0;
  const r = 110;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col items-center px-5 mt-6"
    >
      <div className="text-xs uppercase tracking-widest text-neon font-bold">Rest</div>

      <div className="relative mt-4">
        <svg width="260" height="260" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="130"
            cy="130"
            r={r}
            fill="none"
            stroke="oklch(0.92 0.21 130)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 130 130)"
            style={{ transition: "stroke-dasharray 0.9s linear" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-5xl font-extrabold tabular-nums">{fmt(restLeft)}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">seconds remaining</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onAdjust(-15)}
          className="h-10 px-4 rounded-full bg-white/[0.06] text-sm font-semibold flex items-center gap-1.5"
        >
          <Minus className="size-3.5" /> 15s
        </button>
        <button
          onClick={() => onAdjust(15)}
          className="h-10 px-4 rounded-full bg-white/[0.06] text-sm font-semibold flex items-center gap-1.5"
        >
          <Plus className="size-3.5" /> 15s
        </button>
      </div>

      <div className="mt-6 w-full max-w-sm rounded-3xl bg-surface border border-white/[0.05] p-4 text-center">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {isNextExercise ? "Next exercise" : "Up next"}
        </div>
        <div className="mt-1 font-bold text-lg">{nextName}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Set {nextSet} of {nextSetsTotal} · {nextReps}
        </div>
      </div>

      <div className="mt-auto w-full max-w-sm flex flex-col gap-2 pb-4">
        <button
          onClick={onSkip}
          className="w-full h-14 rounded-full bg-neon text-neon-foreground font-bold text-base glow-neon active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <SkipForward className="size-5" /> {isNextExercise ? "Next exercise" : "Skip rest"}
        </button>
        <button
          onClick={onEnd}
          className="w-full h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-semibold flex items-center justify-center gap-1.5"
        >
          <X className="size-4" /> End Workout
        </button>
      </div>
    </motion.div>
  );
}

/* ============================= Completion screen ============================= */

function CompletionScreen({
  workout,
  savedId,
}: {
  workout: Workout;
  savedId: string | null;
}) {
  // Read saved record so totals reflect actual logged sets.
  const saved =
    typeof window !== "undefined" && savedId
      ? (JSON.parse(localStorage.getItem("fitness:completedWorkouts:v2") || "[]") as CompletedWorkout[]).find(
          (w) => w.id === savedId,
        )
      : undefined;

  const totals = saved
    ? {
        sets: saved.totalSets,
        reps: saved.totalReps,
        volume: saved.totalVolume,
        duration: saved.durationMin,
        calories: saved.calories,
        unit: saved.unit,
        exercises: saved.exercises.filter((e) => e.sets.some((s) => s.completed)).length,
        best: saved.bestSet,
      }
    : {
        sets: 0,
        reps: 0,
        volume: 0,
        duration: workout.duration,
        calories: workout.calories,
        unit: "lb" as WeightUnit,
        exercises: workout.exercises.length,
        best: undefined,
      };

  return (
    <div className="min-h-dvh bg-background px-5 py-8 pb-24">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <div className="text-center">
          <div className="mx-auto size-20 rounded-full bg-neon/20 grid place-items-center">
            <Trophy className="size-9 text-neon" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold">Workout complete</h1>
          <p className="mt-2 text-muted-foreground text-sm">{workout.title}</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <Stat label="Minutes" value={`${totals.duration}`} />
          <Stat label="Exercises" value={`${totals.exercises}`} />
          <Stat
            label="Calories"
            value={`${totals.calories}`}
            icon={<Flame className="size-3 text-neon" />}
          />
          <Stat label="Sets" value={`${totals.sets}`} />
          <Stat label="Reps" value={`${totals.reps}`} />
          <Stat
            label={`Volume (${totals.unit})`}
            value={totals.volume.toLocaleString()}
            icon={<Dumbbell className="size-3 text-neon" />}
          />
        </div>

        {totals.best && (
          <div className="mt-4 rounded-3xl bg-gradient-to-br from-neon/15 to-transparent border border-neon/20 p-4">
            <div className="text-[10px] uppercase tracking-wider text-neon font-bold">Best set</div>
            <div className="mt-1 font-bold">{totals.best.exerciseName}</div>
            <div className="text-sm text-muted-foreground">
              {totals.best.weight} {totals.best.unit} × {totals.best.reps} reps
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {savedId && (
            <Link
              to="/workout/history/$id"
              params={{ id: savedId }}
              className="h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2"
            >
              <HistoryIcon className="size-4" /> View / edit workout
            </Link>
          )}
          <Link
            to="/home"
            className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="size-4" /> Back to home
          </Link>
          <Link
            to="/workout/$id/session"
            params={{ id: workout.id }}
            className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] font-semibold text-sm flex items-center justify-center gap-2"
            onClick={() =>
              restartSession(
                workout.id,
                workout.title,
                workout.exercises.map((e) => ({
                  id: e.id,
                  name: e.name,
                  sets: e.sets,
                  reps: e.reps,
                  muscleGroup: e.muscleGroup,
                })),
              )
            }
          >
            <RotateCcw className="size-4" /> Do it again
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-white/[0.05] p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-center">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-extrabold tabular-nums text-center">{value}</div>
    </div>
  );
}

void ChevronDown;
void ChevronUp;
void setExerciseNotes;
