import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, History, Loader2 } from "lucide-react";
import { computeCurrentWeekReport } from "@/lib/weeklyReport.functions";
import { ReportView } from "@/components/weekly/ReportView";

export const Route = createFileRoute("/_app/report/")({
  head: () => ({ meta: [{ title: "Weekly Report — Ascendr" }] }),
  component: ReportPage,
  errorComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Couldn't load your report. Try again.</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function ReportPage() {
  const fetchReport = useServerFn(computeCurrentWeekReport);
  const { data, isLoading } = useQuery({
    queryKey: ["weeklyReport", "current"],
    queryFn: () => fetchReport(),
  });
  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="flex items-center justify-between mb-5">
        <Link to="/home" className="size-9 rounded-full bg-surface grid place-items-center">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-bold">Weekly Report</h1>
        <Link
          to="/report/history"
          className="size-9 rounded-full bg-surface grid place-items-center"
          aria-label="History"
        >
          <History className="size-4" />
        </Link>
      </header>
      {isLoading || !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ReportView r={data} />
      )}
    </div>
  );
}
