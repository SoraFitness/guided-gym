import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getWeeklyReport } from "@/lib/weeklyReport.functions";
import { ReportView } from "@/components/weekly/ReportView";

export const Route = createFileRoute("/_app/report/$weekStart")({
  head: () => ({ meta: [{ title: "Weekly Report — Ascendr" }] }),
  component: ReportDetail,
  errorComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Couldn't load this report.</div>
  ),
  notFoundComponent: () => <div className="p-6">Report not found</div>,
});

function ReportDetail() {
  const { weekStart } = Route.useParams();
  const fn = useServerFn(getWeeklyReport);
  const { data, isLoading } = useQuery({
    queryKey: ["weeklyReport", weekStart],
    queryFn: () => fn({ data: { weekStart } }),
  });
  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="flex items-center gap-3 mb-5">
        <Link
          to="/report/history"
          className="size-9 rounded-full bg-surface grid place-items-center"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-bold">Weekly Report</h1>
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
