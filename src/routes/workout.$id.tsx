import { useEffect, useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  notFound,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft, Clock, Flame, Play, Heart, Eye } from "lucide-react";
import { getWorkout, type Workout } from "@/lib/workouts";
import { startSession, updateSession } from "@/lib/workoutSessionStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workout/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${getWorkout(params.id)?.title ?? "Workout"} — Ascendr` }],
  }),
  loader: ({ params }) => {
    const w = getWorkout(params.id);
    if (!w) throw notFound();
    return w;
  },
  component: WorkoutDetail,
  notFoundComponent: () => (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Workout not found</h1>
        <Link to="/workouts" className="mt-4 inline-block text-neon">
          Browse workouts
        </Link>
      </div>
    </div>
  ),
});

const FAVORITES_KEY = "fitness:favoriteWorkouts:v1";

function readFavoriteWorkoutIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeFavoriteWorkoutIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("fitness:favorites-change"));
}

function WorkoutDetail() {
  const w = Route.useLoaderData() as Workout;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailPage = pathname.replace(/\/$/, "") === `/workout/${w.id}`;
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const favorite = favoriteIds.includes(w.id);
  const firstExercise = w.exercises[0];
  const sessionExercises = useMemo(
    () =>
      w.exercises.map((e) => ({
        id: e.id,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        muscleGroup: e.muscleGroup,
      })),
    [w.exercises],
  );

  useEffect(() => {
    setFavoriteIds(readFavoriteWorkoutIds());
  }, []);

  if (!isDetailPage) return <Outlet />;

  const toggleFavorite = () => {
    setFavoriteIds((current) => {
      const next = current.includes(w.id)
        ? current.filter((id) => id !== w.id)
        : [...current, w.id];
      writeFavoriteWorkoutIds(next);
      return next;
    });
  };

  const startSessionNav = (startIndex = 0) => {
    startSession(w.id, w.title, sessionExercises);
    updateSession({
      currentExerciseIndex: Math.min(Math.max(startIndex, 0), w.exercises.length - 1),
    });
    navigate({ to: "/workout/$id/session", params: { id: w.id } });
  };

  const previewWorkout = () => {
    if (!firstExercise) return;
    navigate({
      to: "/workout/$id/demo/$exerciseId",
      params: { id: w.id, exerciseId: firstExercise.id },
    });
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="relative h-[42vh] min-h-[320px] bg-gradient-to-br from-neon/30 via-surface-2 to-background overflow-hidden">
        {w.image && (
          <img
            src={w.image}
            alt={`${w.title} preview`}
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: w.imagePosition }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-background" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 40%, oklch(0.92 0.21 130 / 0.5), transparent 70%)",
          }}
        />
        <div className="absolute inset-x-0 top-0 z-20 p-5 flex items-center justify-between">
          <Link
            to="/workouts"
            className="size-10 rounded-full bg-black/40 backdrop-blur grid place-items-center"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <button
            onClick={toggleFavorite}
            className={cn(
              "size-10 rounded-full backdrop-blur grid place-items-center transition",
              favorite ? "bg-neon text-neon-foreground" : "bg-black/40 text-white",
            )}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={favorite}
          >
            <Heart className={cn("size-5", favorite && "fill-current")} />
          </button>
        </div>
        <div className="absolute inset-0 z-10 pointer-events-none grid place-items-center">
          <button
            onClick={previewWorkout}
            aria-label="Preview workout"
            className="pointer-events-auto size-20 rounded-full bg-neon text-neon-foreground grid place-items-center animate-pulse-glow active:scale-95 transition"
          >
            <Play className="size-8 fill-current ml-1" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-16 px-5 text-center">
          <div className="inline-flex rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
            Preview first exercise
          </div>
        </div>
        <div className="absolute bottom-4 left-5 flex gap-2">
          <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-xs flex items-center gap-1.5">
            <Clock className="size-3.5 text-neon" />
            {w.duration} min
          </span>
          <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-xs flex items-center gap-1.5">
            <Flame className="size-3.5 text-neon" />
            {w.calories} kcal
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-32">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{w.category}</span>
          <span>·</span>
          <span>{w.difficulty}</span>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold">{w.title}</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">{w.description}</p>

        <div className="mt-7 flex items-center justify-between">
          <h2 className="font-bold text-lg">Exercises</h2>
          <span className="text-xs text-muted-foreground">{w.exercises.length} exercises</span>
        </div>
        <ol className="mt-3 space-y-3">
          {w.exercises.map((ex, i) => (
            <li key={ex.id} className="p-3 rounded-2xl bg-surface border border-border">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-surface-2 grid place-items-center font-bold text-neon">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{ex.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {ex.sets} sets · {ex.reps ?? ex.time} · rest {ex.rest}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  to="/workout/$id/demo/$exerciseId"
                  params={{ id: w.id, exerciseId: ex.id }}
                  className="h-9 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Eye className="size-3.5" /> 3D Demo
                </Link>
                <button
                  onClick={() => startSessionNav(i)}
                  className="h-9 rounded-full bg-neon/15 text-neon text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Play className="size-3.5 fill-current" /> Start
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="fixed bottom-0 inset-x-0 pointer-events-none px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={() => startSessionNav()}
          className="pointer-events-auto w-full h-14 rounded-full bg-neon text-neon-foreground font-semibold text-base glow-neon active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Play className="size-5 fill-current" /> Let's workout
        </button>
      </div>
    </div>
  );
}
