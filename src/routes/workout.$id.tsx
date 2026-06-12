import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Flame, Play, Heart, Eye } from "lucide-react";
import { getWorkout, type Workout } from "@/lib/workouts";

export const Route = createFileRoute("/workout/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${getWorkout(params.id)?.title ?? "Workout"} — Pulse` }],
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
        <Link to="/workouts" className="mt-4 inline-block text-neon">Browse workouts</Link>
      </div>
    </div>
  ),
});

function WorkoutDetail() {
  const w = Route.useLoaderData() as Workout;
  const navigate = useNavigate();
  const startSessionNav = () =>
    navigate({ to: "/workout/$id/session", params: { id: w.id } });

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="relative h-[42vh] min-h-[320px] bg-gradient-to-br from-neon/30 via-surface-2 to-background overflow-hidden">
        <div className="absolute inset-0 opacity-60" style={{
          background: "radial-gradient(60% 50% at 50% 40%, oklch(0.92 0.21 130 / 0.5), transparent 70%)",
        }} />
        <div className="absolute inset-x-0 top-0 p-5 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/workouts" })}
            className="size-10 rounded-full bg-black/40 backdrop-blur grid place-items-center"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button className="size-10 rounded-full bg-black/40 backdrop-blur grid place-items-center" aria-label="Favorite">
            <Heart className="size-5" />
          </button>
        </div>
        <div className="absolute inset-0 grid place-items-center">
          <button
            onClick={startSessionNav}
            aria-label="Start workout"
            className="size-20 rounded-full bg-neon text-neon-foreground grid place-items-center animate-pulse-glow active:scale-95 transition"
          >
            <Play className="size-8 fill-current ml-1" />
          </button>
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
                  onClick={startSessionNav}
                  className="h-9 rounded-full bg-neon/15 text-neon text-[12px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <Play className="size-3.5 fill-current" /> Start
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={startSessionNav}
          className="w-full h-14 rounded-full bg-neon text-neon-foreground font-semibold text-base glow-neon active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <Play className="size-5 fill-current" /> Let's workout
        </button>
      </div>
    </div>
  );
}
