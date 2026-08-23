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
    <div className="mx-auto min-h-dvh w-full min-w-0 max-w-md overflow-x-clip bg-background page-pb-safe">
      <div className="flex min-w-0 items-center gap-3 px-4 pb-3 page-pt-safe sm:px-5">
        <Link
          to="/workouts"
          className="size-10 rounded-full bg-white/[0.06] grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 text-[clamp(1.5rem,7vw,1.875rem)] font-extrabold leading-tight">
          Workout history
        </h1>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 px-4 sm:px-5">
        <Stat label="Workouts" value={`${prs.totalWorkouts}`} />
        <Stat label="Total sets" value={`${prs.totalSets}`} />
        <Stat label="Total reps" value={`${prs.totalReps}`} />
      </div>

      {history.length === 0 ? (
        <div className="mt-12 px-4 text-center text-muted-foreground sm:px-5">
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
        <div className="mt-5 flex flex-col gap-2 px-4 sm:px-5">
          {history.map((w) => (
            <Link
              key={w.id}
              to="/workout/history/$id"
              params={{ id: w.id }}
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.05] bg-surface p-4 transition active:scale-[0.99]"
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
    <div className="min-w-0 rounded-2xl border border-white/[0.05] bg-surface p-2.5 text-center sm:p-3">
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      <div className="truncate text-[9px] uppercase tracking-wide text-muted-foreground sm:text-[10px] sm:tracking-wider">
        {label}
      </div>
    </div>
  );
}

// keep fmtTime exported usage minimal
void fmtTime;
