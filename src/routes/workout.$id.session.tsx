import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flag,
  Flame,
  Trophy,
  Home,
  RotateCcw,
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

function SessionPage() {
  const w = Route.useLoaderData() as Workout;
  const navigate = useNavigate();
  const { profile } = useProfile();
  const session = useActiveSession();
  const [finished, setFinished] = useState(false);

  // Boot the session
  useEffect(() => {
    if (!session || session.workoutId !== w.id || session.status !== "active") {
      startSession(w.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.id]);

  const idx = session?.workoutId === w.id ? session.currentExerciseIndex : 0;
  const ex = w.exercises[Math.min(idx, w.exercises.length - 1)];
  const completedSetsForEx = session?.completedSets?.[ex.id] ?? 0;

  const totalSets = useMemo(() => w.exercises.reduce((s, e) => s + e.sets, 0), [w]);
  const doneSets = useMemo(
    () =>
      w.exercises.reduce((s, e) => s + Math.min(e.sets, session?.completedSets?.[e.id] ?? 0), 0),
    [w, session],
  );
  const progressPct = totalSets ? (doneSets / totalSets) * 100 : 0;

  const animation = detectAnimation(ex.name, ex.demoType);
  const gender = genderToAvatar(profile?.gender);

  const handleMarkSet = () => {
    incrementSet(ex.id);
    // auto-advance when sets done
    if (completedSetsForEx + 1 >= ex.sets) {
      if (idx + 1 < w.exercises.length) {
        updateSession({ currentExerciseIndex: idx + 1 });
      }
    }
  };
  const handlePrev = () => idx > 0 && updateSession({ currentExerciseIndex: idx - 1 });
  const handleNext = () =>
    idx + 1 < w.exercises.length && updateSession({ currentExerciseIndex: idx + 1 });

  const handleFinish = () => {
    if (!session) return;
    const startedAt = new Date(session.startedAt).getTime();
    const durationMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    // estimate calories proportional to completion
    const completion = totalSets ? Math.min(1, doneSets / totalSets) : 1;
    const calories = Math.round(w.calories * Math.max(0.3, completion));
    const exercisesCompleted = w.exercises.filter(
      (e) => (session.completedSets[e.id] ?? 0) >= e.sets,
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
    setFinished(true);
  };

  const handleExit = () => {
    if (confirm("End this session? Your progress so far won't be saved as completed.")) {
      clearSession();
      navigate({ to: "/workout/$id", params: { id: w.id } });
    }
  };

  if (finished) {
    return <CompletionScreen workout={w} />;
  }

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

      {/* current exercise */}
      <div className="px-5 mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-2xl font-extrabold leading-tight">{ex.name}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
              <Chip>{ex.muscleGroup}</Chip>
              <Chip>{ex.difficulty}</Chip>
              <Chip>
                {ex.sets} × {ex.reps ?? ex.time}
              </Chip>
              <Chip>Rest {ex.rest}</Chip>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3D viewer */}
      <div className="px-5 mt-4">
        <Exercise3DViewer animation={animation} gender={gender} />
      </div>

      {/* set tracker */}
      <div className="px-5 mt-4">
        <div className="rounded-3xl bg-surface border border-white/[0.05] p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Sets</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">
              {completedSetsForEx}/{ex.sets} complete
            </div>
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: ex.sets }).map((_, i) => (
              <div
                key={i}
                className={
                  "h-2 flex-1 rounded-full " +
                  (i < completedSetsForEx ? "bg-neon" : "bg-white/[0.08]")
                }
              />
            ))}
          </div>
          <button
            onClick={handleMarkSet}
            disabled={completedSetsForEx >= ex.sets}
            className="mt-4 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm glow-neon active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            <Check className="size-4" />
            {completedSetsForEx >= ex.sets ? "All sets done" : "Mark set complete"}
          </button>
        </div>
      </div>

      {/* nav buttons */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={handlePrev}
          disabled={idx === 0}
          className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Previous
        </button>
        <button
          onClick={handleNext}
          disabled={idx + 1 >= w.exercises.length}
          className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
        >
          Next <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="px-5 mt-2 grid grid-cols-2 gap-2">
        <Link
          to="/workout/$id/demo/$exerciseId"
          params={{ id: w.id, exerciseId: ex.id }}
          className="h-12 rounded-full bg-white/[0.05] border border-white/[0.06] text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <Eye className="size-4" /> Watch 3D Demo
        </Link>
        <button
          onClick={handleFinish}
          className="h-12 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <Flag className="size-4" /> Finish workout
        </button>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-full bg-white/[0.06] text-[11px] font-medium">{children}</span>
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
              // restart fresh
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
