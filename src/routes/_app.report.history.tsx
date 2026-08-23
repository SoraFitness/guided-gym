import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { listWeeklyReports } from "@/lib/weeklyReport.functions";

export const Route = createFileRoute("/_app/report/history")({
  head: () => ({ meta: [{ title: "Report History — Ascendr" }] }),
  component: HistoryPage,
  errorComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Couldn't load history.</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function fmt(s: string) {
  const d = new Date(s + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function HistoryPage() {
  const fn = useServerFn(listWeeklyReports);
  const { data, isLoading } = useQuery({
    queryKey: ["weeklyReport", "history"],
    queryFn: () => fn(),
  });
  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="flex items-center gap-3 mb-5">
        <Link
          to="/report"
          aria-label="Back to current report"
          className="size-9 rounded-full bg-surface grid place-items-center"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-bold text-lg">Report history</h1>
      </header>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 text-center text-sm text-muted-foreground">
          No finalized reports yet. Your first report finalizes Sunday evening.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((r) => (
            <li key={r.week_start as string}>
              <Link
                to="/report/$weekStart"
                params={{ weekStart: r.week_start as string }}
                className="flex items-center justify-between rounded-2xl bg-surface border border-white/[0.05] p-4 active:bg-white/[0.02]"
              >
                <div>
                  <div className="font-semibold text-sm">
                    {fmt(r.week_start as string)} – {fmt(r.week_end as string)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {r.workouts_completed}/{r.planned_workouts} workouts · {r.protein_hit_days}/7
                    protein ·{" "}
                    {r.weight_change_kg !== null
                      ? `${(r.weight_change_kg as number) > 0 ? "+" : ""}${r.weight_change_kg} kg`
                      : "no weight"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-neon tabular-nums">
                    {r.overall_score}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
