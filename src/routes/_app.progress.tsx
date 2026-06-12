import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Clock, Trophy, TrendingUp, Dumbbell, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useCompletedWorkouts, computePRs } from "@/lib/workoutSessionStore";
import { useProgress, useWorkoutLog } from "@/lib/progressStore";
import { GoalPanel } from "@/components/GoalPanel";
import { ProgressPicturesCard } from "@/components/photos/ProgressPicturesCard";
import { WeeklyReportCard } from "@/components/weekly/WeeklyReportCard";


export const Route = createFileRoute("/_app/progress")({
  head: () => ({ meta: [{ title: "Progress — Pulse" }] }),
  component: ProgressPage,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ProgressPage() {
  const history = useCompletedWorkouts();
  const log = useWorkoutLog();
  const progress = useProgress();
  const prs = useMemo(() => computePRs(history), [history]);

  const week = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day);
    const minutes = Array(7).fill(0);
    for (const l of log) {
      const d = new Date(l.date);
      const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) minutes[diff] += l.minutes;
    }
    const max = Math.max(60, ...minutes);
    return DAY_LABELS.map((d, i) => ({ d, v: (minutes[i] / max) * 100, m: minutes[i] }));
  }, [log]);

  const weeklyCalories = history
    .filter((w) => {
      const now = new Date();
      const day = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - day);
      return new Date(w.completedAt).getTime() >= monday.getTime();
    })
    .reduce((s, w) => s + w.calories, 0);

  const trainedMin = log.reduce((s, l) => s + l.minutes, 0);
  const trainedH = Math.floor(trainedMin / 60);
  const trainedM = trainedMin % 60;

  const prEntries = Object.entries(prs.maxWeightByExercise)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);
  const e1rmEntries = Object.entries(prs.best1RMByExercise)
    .sort((a, b) => b[1].e1rm - a[1].e1rm)
    .slice(0, 3);

  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Progress</h1>
        <Link
          to="/workout/history"
          className="h-9 px-3 rounded-full bg-white/[0.05] border border-white/[0.06] text-[11px] font-semibold flex items-center gap-1.5"
        >
          History <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-6">
        <GoalPanel />
      </div>

      <div className="mt-6">
        <WeeklyReportCard />
      </div>

      <div className="mt-4">
        <ProgressPicturesCard />
      </div>


      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard icon={Flame} label="This week" value={`${weeklyCalories}`} unit="kcal" />
        <StatCard
          icon={Clock}
          label="Trained"
          value={trainedH > 0 ? `${trainedH}h ${trainedM}m` : `${trainedM}m`}
        />
        <StatCard icon={Trophy} label="Streak" value={`${progress.streakDays} days`} />
        <StatCard icon={TrendingUp} label="Workouts" value={`${prs.totalWorkouts}`} tint />
      </div>

      <section className="mt-8 rounded-3xl bg-surface p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold">Weekly activity</h2>
          <span className="text-xs text-muted-foreground">Minutes</span>
        </div>
        <div className="h-44 flex items-end gap-3">
          {week.map((day) => (
            <div key={day.d} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-[10px] text-muted-foreground tabular-nums">
                {day.m > 0 ? day.m : ""}
              </div>
              <div
                className="w-full rounded-t-xl bg-gradient-to-t from-neon to-emerald-300 transition-all"
                style={{ height: `${Math.max(2, day.v)}%` }}
              />
              <span className="text-[11px] text-muted-foreground">{day.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-surface p-5">
        <h2 className="font-bold mb-3">Volume & sets</h2>
        <Record label="Total sets" value={`${prs.totalSets}`} />
        <Record label="Total reps" value={`${prs.totalReps}`} />
        <Record
          label="Total volume"
          value={`${prs.totalVolume.toLocaleString()}`}
        />
        <Record
          label="Best workout volume"
          value={
            prs.bestVolumeWorkout
              ? `${prs.bestVolumeWorkout.volume.toLocaleString()} ${prs.bestVolumeWorkout.unit}`
              : "—"
          }
          last
        />
      </section>

      <section className="mt-6 rounded-3xl bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Personal records</h2>
          <Dumbbell className="size-4 text-neon" />
        </div>
        {prEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete a workout with weights to start tracking PRs.
          </p>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Heaviest sets
            </div>
            {prEntries.map(([name, pr], i) => (
              <Record
                key={name}
                label={name}
                value={`${pr.weight} ${pr.unit} × ${pr.reps}`}
                last={i === prEntries.length - 1}
              />
            ))}
            {e1rmEntries.length > 0 && (
              <>
                <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Estimated 1RM
                </div>
                {e1rmEntries.map(([name, pr], i) => (
                  <Record
                    key={name}
                    label={name}
                    value={`${pr.e1rm} ${pr.unit}`}
                    last={i === e1rmEntries.length - 1}
                  />
                ))}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  tint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  unit?: string;
  tint?: boolean;
}) {
  return (
    <div className={`rounded-3xl p-4 ${tint ? "bg-neon text-neon-foreground" : "bg-surface"}`}>
      <Icon className="size-5" />
      <div className="mt-6 text-2xl font-extrabold">
        {value}
        {unit && <span className="text-sm font-medium ml-1 opacity-70">{unit}</span>}
      </div>
      <div className={`text-xs ${tint ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );
}

function Record({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2.5 text-sm ${last ? "" : "border-b border-border"}`}>
      <span className="text-muted-foreground truncate pr-3">{label}</span>
      <span className="font-semibold tabular-nums shrink-0">{value}</span>
    </div>
  );
}
