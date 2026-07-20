import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { computeCurrentWeekReport } from "@/lib/weeklyReport.functions";
import { ScoreRing } from "./ScoreRing";

export function WeeklyReportCard({ compact = false }: { compact?: boolean }) {
  const fetchReport = useServerFn(computeCurrentWeekReport);
  const { data, isLoading } = useQuery({
    queryKey: ["weeklyReport", "current"],
    queryFn: () => fetchReport(),
    staleTime: 60_000,
  });

  const hasData =
    data && (data.workoutsCompleted > 0 || data.averageCalories > 0 || data.proteinHitDays > 0);

  if (compact) {
    return (
      <Link
        to="/report"
        className="group flex min-h-[92px] items-center gap-3.5 rounded-[25px] border border-neon/20 bg-gradient-to-r from-neon/[0.09] via-surface to-surface p-4 transition active:scale-[0.99]"
      >
        {isLoading ? (
          <div className="size-14 shrink-0 animate-pulse rounded-2xl bg-white/[0.05]" />
        ) : hasData ? (
          <ScoreRing score={data!.overallScore} size={56} label="Score" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-neon/15 bg-neon/10 text-neon">
            <Sparkles className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-neon">
            Weekly insight
          </p>
          <h2 className="mt-1 text-sm font-bold">Your Weekly Report</h2>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">
            {isLoading
              ? "Building your latest snapshot…"
              : hasData
                ? `${data!.workoutsCompleted}/${data!.plannedWorkouts} workouts · ${data!.proteinHitDays}/7 protein days`
                : "Log workouts and meals to unlock your first report."}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-active:translate-x-0.5" />
      </Link>
    );
  }

  return (
    <Link
      to="/report"
      className="block rounded-3xl bg-gradient-to-br from-neon/10 via-surface to-surface border border-neon/20 p-5 active:opacity-80 transition"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-neon" />
          <h2 className="font-bold text-sm">Your Weekly Report</h2>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
      {isLoading ? (
        <div className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
      ) : hasData ? (
        <div className="flex items-center gap-4">
          <ScoreRing score={data!.overallScore} size={84} label="Score" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">View this week's report</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {data!.workoutsCompleted}/{data!.plannedWorkouts} workouts · {data!.proteinHitDays}/7
              protein days
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/10 border border-neon/20">
              <span className="text-[11px] font-semibold text-neon">Tap to open</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-muted-foreground">
          Weekly report builds as you log workouts and meals.
        </div>
      )}
    </Link>
  );
}
