import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Flame,
  Trophy,
  Home,
  RotateCcw,
  SkipForward,
  X,
  Timer,
  Plus,
  Minus,
} from "lucide-react";
import { getWorkout, type Workout } from "@/lib/workouts";
import { useProfile } from "@/lib/profile";
import {
  clearSession,
  incrementSet,
  saveCompletedWorkout,
  startSession,
  updateSession,
  useActiveSession,
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

/** parse "60s", "1m", "90" → seconds */
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

  // Seed the session SYNCHRONOUSLY so the very first render has correct state.
  // useState initializer runs once on mount, before paint.
  useState(() => {
    if (typeof window === "undefined") return null;
    // eslint-disable-next-line no-console
    console.log("[workout-session] booting", w.id);
    return startSession(w.id);
  });
  const session = useActiveSession();

  const [phase, setPhase] = useState<Phase>("exercise");
  const [restTotal, setRestTotal] = useState(45);
  const [restLeft, setRestLeft] = useState(45);
  const restTimer = useRef<number | null>(null);

  const activeForThis =
    session && session.workoutId === w.id && session.status === "active" ? session : null;
  const idx = activeForThis ? activeForThis.currentExerciseIndex : 0;
  const ex = w.exercises[Math.min(idx, w.exercises.length - 1)];
  const completedSetsForEx = activeForThis?.completedSets?.[ex.id] ?? 0;
  const currentSet = Math.min(ex.sets, completedSetsForEx + 1);


  const totalSets = useMemo(() => w.exercises.reduce((s, e) => s + e.sets, 0), [w]);
  const doneSets = useMemo(
    () => w.exercises.reduce((s, e) => s + Math.min(e.sets, session?.completedSets?.[e.id] ?? 0), 0),
    [w, session],
  );
  const progressPct = totalSets ? (doneSets / totalSets) * 100 : 0;

  const animation = detectAnimation(ex.name, ex.demoType);
  const gender = genderToAvatar(profile?.gender);

  // ----- rest timer -----
  const startRest = useCallback(
    (seconds: number) => {
      setRestTotal(seconds);
      setRestLeft(seconds);
      setPhase("rest");
    },
    [],
  );

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

  // ----- finish helpers -----
  const finalize = useCallback(
    (manual: boolean) => {
      const startedAt = session ? new Date(session.startedAt).getTime() : Date.now();
      const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const completion = totalSets ? Math.min(1, doneSets / totalSets) : 1;
      const calories = Math.round(w.calories * Math.max(0.3, completion));
      const exercisesCompleted = w.exercises.filter(
        (e) => (session?.completedSets[e.id] ?? 0) >= e.sets,
      ).length;
      saveCompletedWorkout({
        id: crypto.randomUUID(),
        workoutId: w.id,
        workoutTitle: w.title,
        completedAt: new Date().toISOString(),
        durationMin,
        calories,
        exercisesCompleted,
      });
      logWorkout(durationMin, w.id);
      clearSession();
      setPhase("complete");
      void manual;
    },
    [doneSets, session, totalSets, w],
  );

  // ----- actions -----
  const handleCompleteSet = () => {
    if (!session) return;
    incrementSet(ex.id);
    const isLastSet = currentSet >= ex.sets;
    const isLastExercise = idx + 1 >= w.exercises.length;

    if (isLastSet && isLastExercise) {
      finalize(false);
      return;
    }
    if (isLastSet) {
      // advance exercise after rest
      updateSession({ currentExerciseIndex: idx + 1 });
    }
    startRest(parseRest(ex.rest));
  };

  const handleSkipExercise = () => {
    if (!session) return;
    if (idx + 1 >= w.exercises.length) {
      finalize(false);
      return;
    }
    // mark remaining sets as done so progress reflects skip
    const remaining = ex.sets - completedSetsForEx;
    for (let i = 0; i < remaining; i++) incrementSet(ex.id);
    updateSession({ currentExerciseIndex: idx + 1 });
    setPhase("exercise");
  };

  const handleEndWorkout = () => {
    if (confirm("End this workout? We'll save what you've completed so far.")) {
      finalize(true);
    }
  };

  const handleExit = () => {
    if (confirm("Exit without saving this session?")) {
      clearSession();
      navigate({ to: "/workout/$id", params: { id: w.id } });
    }
  };

  if (phase === "complete") return <CompletionScreen workout={w} />;

  // next-up info for rest screen
  const nextExerciseIdx = currentSet >= ex.sets ? idx + 1 : idx;
  const nextEx = w.exercises[Math.min(nextExerciseIdx, w.exercises.length - 1)];
  const nextSetNo =
    nextExerciseIdx === idx ? currentSet + 1 : 1;

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
          {doneSets}/{totalSets} sets
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "exercise" ? (
          <motion.div
            key={`ex-${ex.id}-${currentSet}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex-1 flex flex-col"
          >
            {/* exercise hero */}
            <div className="px-5 mt-4">
              <h1 className="text-3xl font-extrabold leading-tight">{ex.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <Chip className="bg-neon/15 text-neon">
                  Set {currentSet} of {ex.sets}
                </Chip>
                <Chip className="bg-white/10 font-bold text-sm px-3 py-1.5">
                  {ex.reps ? `${ex.reps} reps` : ex.time}
                </Chip>
                <Chip>{ex.muscleGroup}</Chip>
                <Chip>{ex.difficulty}</Chip>
                <Chip>Rest {ex.rest}</Chip>
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

            {/* set pip tracker */}
            <div className="px-5 mt-4">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Sets progress</span>
                <span className="tabular-nums">{completedSetsForEx}/{ex.sets}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: ex.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={
                      "h-2 flex-1 rounded-full " +
                      (i < completedSetsForEx
                        ? "bg-neon"
                        : i === completedSetsForEx
                        ? "bg-neon/40"
                        : "bg-white/[0.08]")
                    }
                  />
                ))}
              </div>
            </div>

            {/* actions */}
            <div className="px-5 mt-5 flex flex-col gap-2">
              <button
                onClick={handleCompleteSet}
                className="w-full h-14 rounded-full bg-neon text-neon-foreground font-bold text-base glow-neon active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                <Check className="size-5" /> Complete Set
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => startRest(parseRest(ex.rest))}
                  className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Timer className="size-4" /> Rest
                </button>
                <button
                  onClick={handleSkipExercise}
                  className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <SkipForward className="size-4" /> Skip
                </button>
                <button
                  onClick={handleEndWorkout}
                  className="h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <X className="size-4" /> End
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <RestScreen
            key="rest"
            restLeft={restLeft}
            restTotal={restTotal}
            nextName={nextEx.name}
            nextSet={nextSetNo}
            nextSetsTotal={nextEx.sets}
            nextReps={nextEx.reps ? `${nextEx.reps} reps` : nextEx.time ?? ""}
            onAdjust={(d) => setRestLeft((r) => Math.max(5, r + d))}
            onSkip={() => setPhase("exercise")}
            onEnd={handleEndWorkout}
          />
        )}
      </AnimatePresence>
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

function RestScreen({
  restLeft,
  restTotal,
  nextName,
  nextSet,
  nextSetsTotal,
  nextReps,
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
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Up next</div>
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
          <SkipForward className="size-5" /> Next Set
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

function CompletionScreen({ workout }: { workout: Workout }) {
  return (
    <div className="min-h-dvh bg-background grid place-items-center px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto size-20 rounded-full bg-neon/20 grid place-items-center">
          <Trophy className="size-9 text-neon" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold">Workout complete</h1>
        <p className="mt-2 text-muted-foreground text-sm">Nice work finishing {workout.title}.</p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <Stat label="Minutes" value={`${workout.duration}`} />
          <Stat label="Exercises" value={`${workout.exercises.length}`} />
          <Stat
            label="Calories"
            value={`${workout.calories}`}
            icon={<Flame className="size-3 text-neon" />}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/home"
            className="h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Home className="size-4" /> Back to home
          </Link>
          <Link
            to="/workout/$id/session"
            params={{ id: workout.id }}
            className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] font-semibold text-sm flex items-center justify-center gap-2"
            onClick={() => {
              clearSession();
              startSession(workout.id);
            }}
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
      <div className="mt-1 text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
