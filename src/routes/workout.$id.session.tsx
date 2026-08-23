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
  Pause,
  Play,
  Plus,
  Minus,
  StickyNote,
  Trash2,
  ChevronDown,
  ChevronUp,
  Trophy,
  Flame,
  Dumbbell,
  TrendingUp,
  History as HistoryIcon,
  ListPlus,
  Search,
} from "lucide-react";
import { getWorkout, type Workout } from "@/lib/workouts";
import { useProfile } from "@/lib/profile";
import {
  addExtraSet,
  addExerciseToSession,
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
  useCompletedWorkouts,
  parseDurationSeconds,
  type CompletedWorkout,
  type ExerciseLog,
  type SetLog,
  type WeightUnit,
} from "@/lib/workoutSessionStore";
import { logWorkout } from "@/lib/progressStore";
import { Exercise3DViewer } from "@/components/exercise3d/Exercise3DViewer";
import { getExerciseDemoInfo } from "@/lib/exerciseCoaching";
import { resolveDemoModelGender } from "@/lib/demoModel";
import { EXERCISE_LIBRARY, type ExerciseLibraryItem } from "@/lib/workoutCatalog";
import { cn } from "@/lib/utils";
import { createClientId } from "@/lib/clientId";
import {
  getProgressionTarget,
  getWorkoutMomentum,
  progressionPatch,
  type ProgressionTarget,
  type WorkoutMomentum,
} from "@/lib/trainingIntelligence";

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

function parseRest(rest: string | undefined): number {
  if (!rest) return 45;
  const m = rest
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*([sm]?)$/);
  if (!m) return 45;
  const n = parseInt(m[1], 10);
  return m[2] === "m" ? n * 60 : n;
}

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatDurationShort(seconds: number | undefined) {
  if (!seconds) return "Timed";
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

type Phase = "exercise" | "rest" | "complete";

function SessionPage() {
  const w = Route.useLoaderData() as Workout;
  const navigate = useNavigate();
  const { profile } = useProfile();
  const completedHistory = useCompletedWorkouts();

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
        time: e.time,
        muscleGroup: e.muscleGroup,
      })),
    );
  });
  const session = useActiveSession();

  const [phase, setPhase] = useState<Phase>("exercise");
  const [restTotal, setRestTotal] = useState(45);
  const [restLeft, setRestLeft] = useState(45);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [appliedProgressionFor, setAppliedProgressionFor] = useState<string | null>(null);
  const restTimer = useRef<number | null>(null);

  const activeForThis =
    session && session.workoutId === w.id && session.status === "active" ? session : null;
  const sessionExerciseCount = activeForThis?.exercises.length ?? w.exercises.length;
  const idx = activeForThis
    ? Math.min(activeForThis.currentExerciseIndex, Math.max(0, sessionExerciseCount - 1))
    : 0;
  const exLog = activeForThis?.exercises[idx];
  const libraryExercise = exLog
    ? EXERCISE_LIBRARY.find(
        (item) => item.id === exLog.exerciseId || item.name === exLog.exerciseName,
      )
    : undefined;
  const ex =
    (exLog ? w.exercises.find((item) => item.id === exLog.exerciseId) : undefined) ??
    (exLog && libraryExercise
      ? {
          id: libraryExercise.id,
          name: libraryExercise.name,
          sets: exLog.sets.length,
          reps: exLog.sets[0]?.plannedReps ?? libraryExercise.defaultReps,
          rest: libraryExercise.defaultRest,
          muscleGroup: libraryExercise.muscleGroup,
          difficulty: w.difficulty,
          demoType: libraryExercise.demoType,
        }
      : (w.exercises[idx] ?? w.exercises[0]));

  const summary = useMemo(
    () =>
      activeForThis
        ? computeSummary({ exercises: activeForThis.exercises, unit: activeForThis.unit })
        : { totalSets: 0, totalReps: 0, totalVolume: 0, exercisesCompleted: 0 },
    [activeForThis],
  );
  const plannedTotal = useMemo(
    () =>
      activeForThis?.exercises.reduce((total, exercise) => total + exercise.sets.length, 0) ??
      w.exercises.reduce((total, exercise) => total + exercise.sets, 0),
    [activeForThis, w.exercises],
  );
  const progressPct = plannedTotal ? Math.min(100, (summary.totalSets / plannedTotal) * 100) : 0;

  const demo = getExerciseDemoInfo(ex, profile?.experience, profile?.goal);
  const gender = resolveDemoModelGender(profile);
  const timedDurationSeconds = parseDurationSeconds(ex.time) ?? exLog?.sets[0]?.plannedDurationSec;
  const isTimedExercise = timedDurationSeconds != null;
  const progressionTarget = useMemo(
    () =>
      exLog && !isTimedExercise
        ? getProgressionTarget(exLog, completedHistory, activeForThis?.unit ?? "lb")
        : null,
    [activeForThis?.unit, completedHistory, exLog, isTimedExercise],
  );

  const applyProgressionTarget = useCallback(() => {
    if (!exLog || !progressionTarget) return;
    const patch = progressionPatch(progressionTarget);
    exLog.sets
      .filter((set) => !set.completed)
      .forEach((set) => updateSet(exLog.id, set.setNumber, patch));
    setAppliedProgressionFor(exLog.id);
  }, [exLog, progressionTarget]);

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
      id: createClientId(),
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
    if (idx + 1 >= session.exercises.length) {
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
  const nextExLog = activeForThis.exercises[Math.min(idx + 1, activeForThis.exercises.length - 1)];

  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-[480px] flex-col overflow-x-clip bg-background page-pb-safe">
      {/* header */}
      <div className="flex min-w-0 items-center gap-2 px-4 pb-3 page-pt-safe min-[380px]:gap-3 sm:px-5">
        <button
          onClick={handleExit}
          className="size-10 rounded-full bg-white/[0.06] grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground">
            Exercise {idx + 1} of {activeForThis.exercises.length}
          </div>
          <div className="font-bold truncate">{w.title}</div>
        </div>
        <button
          type="button"
          onClick={() => setShowExercisePicker(true)}
          className="grid size-10 place-items-center rounded-full border border-neon/20 bg-neon/10 text-neon"
          aria-label="Add an exercise"
        >
          <ListPlus className="size-4" />
        </button>
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
              <p className="mt-1.5 max-w-[38ch] text-[11px] font-medium leading-relaxed text-white/65">
                <span className="mr-1 font-black uppercase tracking-[0.12em] text-neon">
                  Form cue
                </span>
                {demo.trainerCue}
              </p>
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

            <LiveSetBoard
              nextSet={nextIncomplete}
              totalSets={exLog.sets.length}
              completedCount={completedCount}
              unit={activeForThis.unit}
              isBodyweight={exLog.isBodyweight}
              durationSeconds={timedDurationSeconds}
              rest={ex.rest}
            />

            {progressionTarget && (
              <ProgressionTargetCard
                target={progressionTarget}
                applied={appliedProgressionFor === exLog.id}
                onApply={applyProgressionTarget}
              />
            )}

            {/* 3D viewer */}
            <div className="px-5 mt-4">
              <Exercise3DViewer
                animation={demo.animation}
                gender={gender}
                showControls={false}
                label={ex.name}
                exerciseId={ex.id}
                primaryMuscles={demo.primaryMuscles}
                secondaryMuscles={demo.secondaryMuscles}
                equipment={demo.equipment}
              />
            </div>

            {/* set tracker */}
            <SetTracker
              exLog={exLog}
              unit={activeForThis.unit}
              onComplete={handleCompleteSet}
              onAddSet={() => addExtraSet(exLog.id)}
              timedDurationSeconds={timedDurationSeconds}
            />

            {/* actions */}
            <div className="px-5 mt-5 flex flex-col gap-2">
              {!isTimedExercise && (
                <button
                  onClick={() => nextIncomplete && handleCompleteSet(nextIncomplete.setNumber)}
                  disabled={!nextIncomplete}
                  className="w-full h-14 rounded-full bg-neon text-neon-foreground font-bold text-base glow-neon active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Check className="size-5" />
                  {nextIncomplete ? `Complete Set ${nextIncomplete.setNumber}` : "All sets done"}
                </button>
              )}
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
                  {idx + 1 >= activeForThis.exercises.length ? "Finish" : "Next"}
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
                  : isTimedExercise
                    ? "timer completes each interval and starts your rest"
                    : "tap + Add Set for more"}
              </div>
            </div>
          </motion.div>
        ) : (
          <RestScreen
            key="rest"
            restLeft={restLeft}
            restTotal={restTotal}
            nextName={nextIncomplete ? ex.name : nextExLog.exerciseName}
            nextSet={nextIncomplete?.setNumber ?? 1}
            nextSetsTotal={nextIncomplete ? exLog.sets.length : nextExLog.sets.length}
            nextReps={
              nextIncomplete
                ? isTimedExercise
                  ? `${formatDurationShort(timedDurationSeconds)} timer`
                  : `${nextIncomplete.actualReps} reps`
                : nextExLog.sets[0]?.plannedDurationSec
                  ? `${formatDurationShort(nextExLog.sets[0].plannedDurationSec)} timer`
                  : `${nextExLog.sets[0]?.plannedReps ?? "10"} reps`
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

      <AnimatePresence>
        {showExercisePicker && (
          <ExercisePicker
            equipment={profile?.equipment ?? "mixed"}
            onClose={() => setShowExercisePicker(false)}
            onAdd={(exercise) => {
              addExerciseToSession({
                id: exercise.id,
                name: exercise.name,
                sets: exercise.defaultSets,
                reps: exercise.defaultReps,
                muscleGroup: exercise.muscleGroup,
              });
              setShowExercisePicker(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ExercisePicker({
  equipment,
  onAdd,
  onClose,
}: {
  equipment: "none" | "dumbbells" | "gym" | "mixed";
  onAdd: (exercise: ExerciseLibraryItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All");
  const muscleGroups = useMemo(
    () => [
      "All",
      ...Array.from(new Set(EXERCISE_LIBRARY.map((exercise) => exercise.muscleGroup))).sort(),
    ],
    [],
  );
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return EXERCISE_LIBRARY.filter(
      (exercise) =>
        (equipment === "mixed" || exercise.equipment.includes(equipment)) &&
        (muscle === "All" || exercise.muscleGroup === muscle) &&
        (!normalized ||
          exercise.name.toLowerCase().includes(normalized) ||
          exercise.muscleGroup.toLowerCase().includes(normalized)),
    ).slice(0, 80);
  }, [equipment, muscle, query]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Add an exercise"
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="max-h-[88dvh] w-full overflow-hidden rounded-t-[30px] border border-white/[0.08] bg-background page-pb-safe"
      >
        <div className="px-5 pb-3 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">
                Exercise library
              </p>
              <h2 className="text-xl font-extrabold">Add an exercise</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-white/[0.06]"
              aria-label="Close exercise picker"
            >
              <X className="size-4" />
            </button>
          </div>
          <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercise or muscle"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {muscleGroups.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setMuscle(group)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3 text-[10px] font-semibold",
                  muscle === group
                    ? "border-neon bg-neon text-neon-foreground"
                    : "border-white/[0.07] bg-white/[0.03] text-muted-foreground",
                )}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[58dvh] overflow-y-auto border-t border-white/[0.06] px-5 pb-8 pt-3">
          <p className="mb-2 text-[10px] text-muted-foreground">{matches.length} exercises</p>
          <div className="grid gap-2">
            {matches.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onAdd(exercise)}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-left active:bg-neon/10"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neon/10 text-neon">
                  <Dumbbell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{exercise.name}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {exercise.muscleGroup} · {exercise.defaultSets} sets · {exercise.defaultReps}{" "}
                    reps
                  </p>
                </div>
                <span className="grid size-8 place-items-center rounded-full bg-neon text-neon-foreground">
                  <Plus className="size-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================= Set tracker ============================= */

function LiveSetBoard({
  nextSet,
  totalSets,
  completedCount,
  unit,
  isBodyweight,
  durationSeconds,
  rest,
}: {
  nextSet: SetLog | undefined;
  totalSets: number;
  completedCount: number;
  unit: WeightUnit;
  isBodyweight: boolean;
  durationSeconds?: number;
  rest: string | undefined;
}) {
  const completed = !nextSet;
  const isTimed = durationSeconds != null;
  const repTarget = nextSet?.actualReps ?? 0;
  const loadTarget = isBodyweight
    ? "BW"
    : nextSet?.weight
      ? `${nextSet.weight} ${unit}`
      : "Set load";

  return (
    <section className="mx-5 mt-4 overflow-hidden rounded-[23px] border border-neon/20 bg-gradient-to-br from-neon/[0.13] via-neon/[0.045] to-white/[0.025] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.18em] text-neon">
            Live set board
          </p>
          <h2 className="mt-1 text-[15px] font-extrabold">
            {completed ? "Exercise complete" : `Set ${nextSet.setNumber} is up next`}
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-bold tabular-nums text-white/75">
          {completedCount}/{totalSets} logged
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <LiveSetMetric
          label={isTimed ? "Timer" : "Target"}
          value={
            completed
              ? "Done"
              : isTimed
                ? formatDurationShort(durationSeconds)
                : `${repTarget} reps`
          }
        />
        <LiveSetMetric label="Load" value={completed ? "—" : loadTarget} />
        <LiveSetMetric label="Rest" value={completed ? "—" : rest || "45s"} />
      </div>

      <div
        className="mt-3 flex items-center gap-1.5"
        aria-label={`${completedCount} of ${totalSets} sets complete`}
      >
        {Array.from({ length: totalSets }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index < completedCount
                ? "bg-neon"
                : index === completedCount
                  ? "bg-white/65"
                  : "bg-white/[0.10]",
            )}
          />
        ))}
      </div>
    </section>
  );
}

function LiveSetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.065] bg-black/20 px-2.5 py-2">
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-[11px] font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function ProgressionTargetCard({
  target,
  applied,
  onApply,
}: {
  target: ProgressionTarget;
  applied: boolean;
  onApply: () => void;
}) {
  const formatSet = (weight: number, reps: number) =>
    weight > 0 ? `${weight} ${target.lastUnit} × ${reps}` : `BW × ${reps}`;
  const sourceDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(target.sourceDate),
  );

  return (
    <section className="relative mx-5 mt-3 overflow-hidden rounded-[23px] border border-analytics-violet/25 bg-gradient-to-br from-analytics-violet/[0.15] via-surface to-surface p-3.5 shadow-[0_18px_38px_-30px_var(--analytics-violet)]">
      <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-analytics-violet/15 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl border border-analytics-violet/25 bg-analytics-violet/15 text-analytics-violet">
          <TrendingUp className="size-[17px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[8px] font-black uppercase tracking-[0.17em] text-analytics-violet">
            Smart progression
          </p>
          <h2 className="mt-1 text-[14px] font-extrabold leading-tight">{target.title}</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{target.detail}</p>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
            Last logged · {sourceDate}
          </p>
          <p className="mt-1 text-[12px] font-extrabold tabular-nums">
            {formatSet(target.lastWeight, target.lastReps)}
          </p>
        </div>
        <div className="rounded-2xl border border-analytics-violet/20 bg-analytics-violet/[0.09] px-3 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wider text-analytics-violet">
            Today&apos;s target
          </p>
          <p className="mt-1 text-[12px] font-extrabold tabular-nums">
            {formatSet(target.targetWeight, target.targetReps)}
          </p>
        </div>
      </div>

      {applied ? (
        <div className="relative mt-3 flex h-10 items-center justify-center gap-1.5 rounded-full border border-neon/20 bg-neon/10 text-[10px] font-extrabold text-neon">
          <Check className="size-3.5" /> Target applied to remaining sets
        </div>
      ) : (
        <button
          type="button"
          onClick={onApply}
          className="relative mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-[10px] font-extrabold text-black transition active:scale-[0.98]"
        >
          Apply target to remaining sets <TrendingUp className="size-3.5" />
        </button>
      )}
    </section>
  );
}

function SetTracker({
  exLog,
  unit,
  onComplete,
  onAddSet,
  timedDurationSeconds,
}: {
  exLog: ExerciseLog;
  unit: WeightUnit;
  onComplete: (setNumber: number) => void;
  onAddSet: () => void;
  timedDurationSeconds?: number;
}) {
  const [openNotesFor, setOpenNotesFor] = useState<number | null>(null);

  if (timedDurationSeconds != null) {
    return (
      <TimedSetTracker
        exLog={exLog}
        durationSeconds={timedDurationSeconds}
        onComplete={onComplete}
        onAddSet={onAddSet}
      />
    );
  }

  return (
    <div className="px-5 mt-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">Sets</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {exLog.sets.filter((s) => s.completed).length}/{exLog.sets.length} done
        </span>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_32px_32px] gap-1.5 px-1 pb-1.5 text-[9px] uppercase tracking-wide text-muted-foreground min-[380px]:grid-cols-[28px_1fr_1fr_36px_36px] min-[380px]:gap-2 min-[380px]:px-2 min-[380px]:text-[10px] min-[380px]:tracking-wider">
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

function TimedSetTracker({
  exLog,
  durationSeconds,
  onComplete,
  onAddSet,
}: {
  exLog: ExerciseLog;
  durationSeconds: number;
  onComplete: (setNumber: number) => void;
  onAddSet: () => void;
}) {
  const nextSet = exLog.sets.find((set) => !set.completed);
  const initialSeconds = nextSet?.plannedDurationSec ?? durationSeconds;
  const completedCount = exLog.sets.filter((set) => set.completed).length;
  const [targetSeconds, setTargetSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const remainingRef = useRef(initialSeconds);

  useEffect(() => {
    setRunning(false);
    setTargetSeconds(initialSeconds);
    setRemainingSeconds(initialSeconds);
    remainingRef.current = initialSeconds;
  }, [initialSeconds, nextSet?.setNumber]);

  useEffect(() => {
    const setNumber = nextSet?.setNumber;
    if (!running || !setNumber) return;
    const interval = window.setInterval(() => {
      const nextRemaining = Math.max(0, remainingRef.current - 1);
      remainingRef.current = nextRemaining;
      setRemainingSeconds(nextRemaining);
      if (nextRemaining === 0) {
        window.clearInterval(interval);
        setRunning(false);
        updateSet(exLog.id, setNumber, { actualDurationSec: targetSeconds, actualReps: 0 });
        onComplete(setNumber);
      }
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [exLog.id, nextSet?.setNumber, onComplete, running, targetSeconds]);

  const progress =
    targetSeconds > 0 ? ((targetSeconds - remainingSeconds) / targetSeconds) * 100 : 0;
  const addFiveSeconds = () => {
    setTargetSeconds((current) => current + 5);
    remainingRef.current += 5;
    setRemainingSeconds(remainingRef.current);
  };

  return (
    <section className="px-5 mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-analytics-teal">
            Timed interval
          </p>
          <h3 className="mt-0.5 text-sm font-extrabold">
            {nextSet
              ? `Set ${nextSet.setNumber} of ${exLog.sets.length}`
              : "All intervals complete"}
          </h3>
        </div>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[9px] font-bold tabular-nums text-muted-foreground">
          {completedCount}/{exLog.sets.length} done
        </span>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-analytics-teal/20 bg-[radial-gradient(circle_at_50%_0%,oklch(0.78_0.14_185/0.13),transparent_54%),linear-gradient(145deg,oklch(0.15_0.012_255),oklch(0.1_0.009_255))] p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {running
                ? "Timer running"
                : remainingSeconds === 0
                  ? "Interval complete"
                  : "Ready when you are"}
            </p>
            <strong
              aria-live="polite"
              className="mt-1 block text-[43px] font-extrabold leading-none tracking-[-0.06em] tabular-nums"
            >
              {fmt(remainingSeconds)}
            </strong>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2 text-right">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Target
            </p>
            <p className="mt-0.5 text-sm font-extrabold tabular-nums text-analytics-teal">
              {formatDurationShort(targetSeconds)}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-analytics-teal to-neon transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => setRunning((current) => !current)}
            disabled={!nextSet || remainingSeconds === 0}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-neon text-[12px] font-extrabold text-neon-foreground transition active:scale-[0.98] disabled:opacity-40"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? "Pause" : remainingSeconds === 0 ? "Complete" : "Start timer"}
          </button>
          <button
            type="button"
            onClick={addFiveSeconds}
            disabled={!nextSet}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-4 text-[11px] font-extrabold text-white/80 transition active:scale-[0.98] disabled:opacity-40"
          >
            <Plus className="size-3.5 text-analytics-teal" /> 5 sec
          </button>
        </div>
        <p className="mt-3 text-center text-[9px] leading-relaxed text-muted-foreground">
          The timer marks this set complete and starts your programmed rest automatically.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {exLog.sets.map((set) => {
          const isActive = set.setNumber === nextSet?.setNumber;
          return (
            <div
              key={set.setNumber}
              className={cn(
                "rounded-2xl border px-2 py-2 text-center",
                set.completed
                  ? "border-neon/20 bg-neon/10 text-neon"
                  : isActive
                    ? "border-analytics-teal/30 bg-analytics-teal/10 text-analytics-teal"
                    : "border-white/[0.06] bg-white/[0.025] text-muted-foreground",
              )}
            >
              <p className="text-[8px] font-black uppercase tracking-wider">Set {set.setNumber}</p>
              <p className="mt-1 text-[10px] font-extrabold tabular-nums">
                {set.completed
                  ? "Done"
                  : formatDurationShort(set.plannedDurationSec ?? durationSeconds)}
              </p>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddSet}
        className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-[11px] font-semibold text-muted-foreground transition hover:border-analytics-teal/40 hover:text-foreground"
      >
        <Plus className="size-4" /> Add {formatDurationShort(durationSeconds)} interval
      </button>
    </section>
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
    updateSet(exLog.id, set.setNumber, {
      weight: Math.max(0, Math.round((set.weight + d) * 10) / 10),
    });
  const weightStep = unit === "kg" ? 2.5 : 5;

  return (
    <div
      className={
        "rounded-2xl border " +
        (set.completed ? "bg-neon/10 border-neon/30" : "bg-white/[0.03] border-white/[0.05]")
      }
    >
      <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_32px_32px] items-center gap-1.5 p-1.5 min-[380px]:grid-cols-[28px_1fr_1fr_36px_36px] min-[380px]:gap-2 min-[380px]:p-2">
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

function UnitToggle({ unit, onChange }: { unit: WeightUnit; onChange: (u: WeightUnit) => void }) {
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
      className="mt-6 flex flex-1 flex-col items-center px-4 sm:px-5"
    >
      <div className="text-xs uppercase tracking-widest text-neon font-bold">Rest</div>

      <div className="relative mt-4">
        <svg width="260" height="260" viewBox="0 0 260 260">
          <circle
            cx="130"
            cy="130"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
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

function CompletionScreen({ workout, savedId }: { workout: Workout; savedId: string | null }) {
  // Read saved record so totals reflect actual logged sets.
  const savedHistory =
    typeof window !== "undefined"
      ? (JSON.parse(
          localStorage.getItem("fitness:completedWorkouts:v2") || "[]",
        ) as CompletedWorkout[])
      : [];
  const saved = savedId ? savedHistory.find((entry) => entry.id === savedId) : undefined;
  const momentum = saved ? getWorkoutMomentum(saved, savedHistory) : null;

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
  const loggedWeights =
    saved?.exercises
      .map((exercise) => {
        const weightedSets = exercise.sets.filter((set) => set.completed && set.weight > 0);
        const heaviest = weightedSets.sort((a, b) => b.weight - a.weight)[0];
        return heaviest
          ? {
              name: exercise.exerciseName,
              weight: heaviest.weight,
              reps: heaviest.actualReps,
              unit: heaviest.unit,
            }
          : null;
      })
      .filter(Boolean) ?? [];
  const completedSets =
    saved?.exercises.reduce(
      (count, exercise) => count + exercise.sets.filter((set) => set.completed).length,
      0,
    ) ?? 0;
  const plannedSets =
    saved?.exercises.reduce((count, exercise) => count + exercise.sets.length, 0) ?? 0;
  const completedTimedSeconds =
    saved?.exercises.reduce(
      (seconds, exercise) =>
        seconds +
        exercise.sets
          .filter((set) => set.completed)
          .reduce(
            (setSeconds, set) =>
              setSeconds + (set.actualDurationSec ?? set.plannedDurationSec ?? 0),
            0,
          ),
      0,
    ) ?? 0;
  const needsWeightReview = Boolean(
    saved?.exercises.some((exercise) =>
      exercise.sets.some(
        (set) =>
          set.completed && !exercise.isBodyweight && !set.plannedDurationSec && set.weight <= 0,
      ),
    ),
  );
  const isFullWorkout = plannedSets === 0 || completedSets >= plannedSets;
  const completionLabel = plannedSets ? `${completedSets}/${plannedSets}` : `${completedSets}`;
  const recordCopy = needsWeightReview
    ? {
        eyebrow: "Strength details",
        title: "Add the load you used",
        body: "A quick weight entry makes your next progression target more personal.",
      }
    : loggedWeights.length > 0
      ? {
          eyebrow: "Strength record",
          title: `${loggedWeights.length} weighted exercise${loggedWeights.length === 1 ? "" : "s"} saved`,
          body: "Your real working weights are ready for your next-session target.",
        }
      : completedTimedSeconds > 0
        ? {
            eyebrow: "Interval captured",
            title: "Your timer work is saved",
            body: "Ascendr will use this as a benchmark the next time you repeat the session.",
          }
        : {
            eyebrow: "Session captured",
            title: "Your training is saved",
            body: "Repeat this session to unlock a like-for-like performance comparison.",
          };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background px-4 page-pt-safe page-pb-safe sm:px-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_-6%,oklch(0.92_0.21_130/0.18),transparent_52%),linear-gradient(180deg,oklch(0.16_0.015_255),transparent_70%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="relative mx-auto max-w-md"
      >
        <section className="relative overflow-hidden rounded-[32px] border border-white/[0.09] bg-[linear-gradient(145deg,oklch(1_0_0/0.075),oklch(0.14_0.012_255/0.9)_48%,oklch(0.12_0.01_255/0.92))] px-4 pb-4 pt-5 shadow-[0_30px_80px_-45px_oklch(0_0_0/0.95)]">
          <div className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full border border-neon/15" />
          <div className="pointer-events-none absolute -right-2 -top-4 size-24 rounded-full bg-neon/10 blur-2xl" />
          <div className="relative text-center">
            <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-neon/25 bg-neon/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-neon">
              <Check className="size-3" strokeWidth={3} />{" "}
              {isFullWorkout ? "Session complete" : "Session saved"}
            </span>
            <div className="mx-auto mt-4 grid size-[74px] place-items-center rounded-[26px] border border-neon/25 bg-neon/[0.14] text-neon shadow-[0_0_42px_-16px_var(--color-neon)]">
              <Trophy className="size-8" />
            </div>
            <h1 className="mt-4 text-balance text-[29px] font-extrabold leading-[1.02] tracking-[-0.045em]">
              {isFullWorkout ? "Workout complete." : "Your session is saved."}
            </h1>
            <p className="mt-2 text-[11px] font-medium text-white/60">{workout.title}</p>
            {!isFullWorkout && (
              <p className="mx-auto mt-2 max-w-[31ch] text-[10px] leading-relaxed text-muted-foreground">
                You logged {completedSets} training block{completedSets === 1 ? "" : "s"}. Every
                completed set still counts toward your trend.
              </p>
            )}
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <CompletionMetric label="Time" value={`${totals.duration}m`} />
            <CompletionMetric label="Logged" value={completionLabel} />
            <CompletionMetric
              label="Energy"
              value={`${totals.calories}`}
              suffix="kcal"
              icon={<Flame className="size-3 text-neon" />}
            />
          </div>

          {(completedTimedSeconds > 0 || totals.reps > 0 || totals.volume > 0) && (
            <div className="relative mt-3 flex flex-wrap justify-center gap-2">
              {completedTimedSeconds > 0 && (
                <CompletionPill icon={<Timer className="size-3" />}>
                  {formatCompletionTime(completedTimedSeconds)} timer work
                </CompletionPill>
              )}
              {totals.reps > 0 && (
                <CompletionPill icon={<Check className="size-3" />}>
                  {totals.reps} reps logged
                </CompletionPill>
              )}
              {totals.volume > 0 && (
                <CompletionPill icon={<Dumbbell className="size-3" />}>
                  {totals.volume.toLocaleString()} {totals.unit} volume
                </CompletionPill>
              )}
            </div>
          )}
        </section>

        {totals.best && (
          <div className="mt-4 rounded-[25px] border border-neon/20 bg-gradient-to-br from-neon/[0.14] to-surface p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-neon">
              Best set
            </div>
            <div className="mt-1 font-extrabold">{totals.best.exerciseName}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {totals.best.weight} {totals.best.unit} × {totals.best.reps} reps
            </div>
          </div>
        )}

        {momentum && <PerformanceReplay momentum={momentum} />}

        <div className="mt-4 rounded-[25px] border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-neon">
                {recordCopy.eyebrow}
              </div>
              <div className="mt-1 text-[15px] font-extrabold">{recordCopy.title}</div>
            </div>
            <span className="grid size-9 place-items-center rounded-2xl bg-neon/10 text-neon">
              {needsWeightReview ? (
                <Dumbbell className="size-4" />
              ) : (
                <Check className="size-4" strokeWidth={3} />
              )}
            </span>
          </div>
          {loggedWeights.length > 0 && (
            <div className="mt-3 grid gap-1.5">
              {loggedWeights.slice(0, 4).map((entry) =>
                entry ? (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between text-[11px] text-muted-foreground"
                  >
                    <span className="truncate pr-3">{entry.name}</span>
                    <span className="shrink-0 font-semibold text-foreground">
                      {entry.weight} {entry.unit} × {entry.reps}
                    </span>
                  </div>
                ) : null,
              )}
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {recordCopy.body}
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {savedId && needsWeightReview && (
            <Link
              to="/workout/history/$id"
              params={{ id: savedId }}
              className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-neon text-sm font-extrabold text-neon-foreground glow-neon transition active:scale-[0.98]"
            >
              <Dumbbell className="size-4" /> Add load details
            </Link>
          )}
          {!needsWeightReview && (
            <Link
              to="/progress"
              className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-neon text-sm font-extrabold text-neon-foreground glow-neon transition active:scale-[0.98]"
            >
              <TrendingUp className="size-4" /> See your progress
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/home"
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.045] text-[11px] font-bold text-white/85 transition active:scale-[0.98]"
            >
              <Home className="size-3.5" /> Home
            </Link>
            <Link
              to="/workout/$id/session"
              params={{ id: workout.id }}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.045] text-[11px] font-bold text-white/85 transition active:scale-[0.98]"
              onClick={() =>
                restartSession(
                  workout.id,
                  workout.title,
                  workout.exercises.map((e) => ({
                    id: e.id,
                    name: e.name,
                    sets: e.sets,
                    reps: e.reps,
                    time: e.time,
                    muscleGroup: e.muscleGroup,
                  })),
                )
              }
            >
              <RotateCcw className="size-3.5" /> Do it again
            </Link>
          </div>
          {savedId && !needsWeightReview && (
            <Link
              to="/workout/history/$id"
              params={{ id: savedId }}
              className="flex h-10 items-center justify-center gap-1.5 text-[10px] font-bold text-muted-foreground transition hover:text-white"
            >
              <HistoryIcon className="size-3.5" /> Review workout record
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PerformanceReplay({ momentum }: { momentum: WorkoutMomentum }) {
  return (
    <section className="relative mt-4 overflow-hidden rounded-3xl border border-analytics-violet/20 bg-gradient-to-br from-analytics-violet/[0.15] via-surface to-surface p-4">
      <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-analytics-violet/15 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-analytics-violet/25 bg-analytics-violet/15 text-analytics-violet">
          <TrendingUp className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-analytics-violet">
            Performance replay
          </p>
          <h2 className="mt-1 text-[16px] font-extrabold leading-tight">{momentum.headline}</h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {momentum.detail}
          </p>
        </div>
      </div>

      {momentum.comparison && (
        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
              Last session
            </p>
            <p className="mt-1 text-[15px] font-extrabold tabular-nums">
              {momentum.comparison.previous.toLocaleString()}
              {momentum.comparison.unit && (
                <span className="ml-1 text-[9px] text-muted-foreground">
                  {momentum.comparison.unit}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-analytics-violet/20 bg-analytics-violet/[0.09] px-3 py-2.5">
            <p className="text-[8px] font-bold uppercase tracking-wider text-analytics-violet">
              Today · {momentum.comparison.changePercent > 0 ? "+" : ""}
              {momentum.comparison.changePercent}% {momentum.comparison.label.toLowerCase()}
            </p>
            <p className="mt-1 text-[15px] font-extrabold tabular-nums">
              {momentum.comparison.current.toLocaleString()}
              {momentum.comparison.unit && (
                <span className="ml-1 text-[9px] text-muted-foreground">
                  {momentum.comparison.unit}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {momentum.personalRecords.length > 0 && (
        <div className="relative mt-3 space-y-1.5">
          {momentum.personalRecords.map((record) => (
            <div
              key={record.exerciseName}
              className="flex items-center justify-between gap-3 rounded-2xl border border-neon/15 bg-neon/[0.08] px-3 py-2 text-[10px]"
            >
              <span className="flex min-w-0 items-center gap-1.5 font-bold text-neon">
                <Trophy className="size-3.5 shrink-0" />
                <span className="truncate">{record.exerciseName}</span>
              </span>
              <span className="shrink-0 font-extrabold tabular-nums">{record.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CompletionMetric({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-2 py-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[8px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-[19px] font-extrabold leading-none tabular-nums">
        {value}
        {suffix && (
          <span className="ml-1 text-[8px] font-bold text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function CompletionPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-black/20 px-3 py-1.5 text-[9px] font-bold text-white/70">
      <span className="text-neon">{icon}</span>
      {children}
    </span>
  );
}

function formatCompletionTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

void ChevronDown;
void ChevronUp;
void setExerciseNotes;
