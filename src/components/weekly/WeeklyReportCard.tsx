import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { computeCurrentWeekReport } from "@/lib/weeklyReport.functions";
import { ScoreRing } from "./ScoreRing";

export function WeeklyReportCard() {
  const fetchReport = useServerFn(computeCurrentWeekReport);
  const { data, isLoading } = useQuery({
    queryKey: ["weeklyReport", "current"],
    queryFn: () => fetchReport(),
    staleTime: 60_000,
  });

  const hasData =
    data && (data.workoutsCompleted > 0 || data.averageCalories > 0 || data.proteinHitDays > 0);

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
              {data!.workoutsCompleted}/{data!.plannedWorkouts} workouts · {data!.proteinHitDays}/7 protein days
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
