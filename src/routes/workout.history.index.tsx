import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Clock, Dumbbell, Trophy, ChevronRight } from "lucide-react";
import { useCompletedWorkouts, computePRs } from "@/lib/workoutSessionStore";

export const Route = createFileRoute("/workout/history/")({
  head: () => ({ meta: [{ title: "Workout History — Ascendr" }] }),
  component: HistoryPage,
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function HistoryPage() {
  const history = useCompletedWorkouts();
  const prs = computePRs(history);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Link
          to="/workouts"
          className="size-10 rounded-full bg-white/[0.06] grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Workout history</h1>
      </div>

      <div className="px-5 mt-2 grid grid-cols-3 gap-2">
        <Stat label="Workouts" value={`${prs.totalWorkouts}`} />
        <Stat label="Total sets" value={`${prs.totalSets}`} />
        <Stat label="Total reps" value={`${prs.totalReps}`} />
      </div>

      {history.length === 0 ? (
        <div className="px-5 mt-12 text-center text-muted-foreground">
          <Dumbbell className="mx-auto size-10 opacity-40" />
          <p className="mt-3 text-sm">No completed workouts yet.</p>
          <Link
            to="/workouts"
            className="mt-4 inline-block h-11 px-5 rounded-full bg-neon text-neon-foreground text-sm font-semibold leading-[44px]"
          >
            Browse workouts
          </Link>
        </div>
      ) : (
        <div className="px-5 mt-5 flex flex-col gap-2">
          {history.map((w) => (
            <Link
              key={w.id}
              to="/workout/history/$id"
              params={{ id: w.id }}
              className="rounded-2xl bg-surface border border-white/[0.05] p-4 flex items-center gap-3 active:scale-[0.99] transition"
            >
              <div className="size-11 rounded-xl bg-neon/15 grid place-items-center">
                <Trophy className="size-5 text-neon" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{w.workoutTitle}</div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" /> {fmtDate(w.completedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" /> {w.durationMin}m
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                  {w.totalSets} sets · {w.totalReps} reps · {w.totalVolume.toLocaleString()}{" "}
                  {w.unit}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-white/[0.05] p-3 text-center">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

// keep fmtTime exported usage minimal
void fmtTime;
