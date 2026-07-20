import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, ScanLine } from "lucide-react";
import { BodyScanReport } from "@/components/scans/BodyScanReport";
import { parseBodyScanResult } from "@/lib/bodyScan.functions";
import { getScanSubmission } from "@/lib/scanSubmissions.functions";

export const Route = createFileRoute("/_app/scan/body/$id")({
  head: () => ({ meta: [{ title: "Body Scan Report — Ascendr" }] }),
  component: BodyScanDetail,
});

function BodyScanDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getSubmission = useServerFn(getScanSubmission);
  const detailQuery = useQuery({
    queryKey: ["scan-submission", "body", id],
    queryFn: () => getSubmission({ data: { id, scanType: "body" } }),
  });

  if (detailQuery.isLoading) return <ReportLoading label="Loading your Body Scan" />;

  const result = detailQuery.data ? parseBodyScanResult(detailQuery.data.analysis) : null;
  if (detailQuery.isError || !detailQuery.data || !result || !detailQuery.data.photoUrl) {
    return <ReportUnavailable label="Body Scan" />;
  }

  return (
    <BodyScanReport
      photo={detailQuery.data.photoUrl}
      result={result}
      createdAt={detailQuery.data.analyzedAt ?? detailQuery.data.createdAt}
      onBack={() => navigate({ to: "/scan/body" })}
      onReset={() => navigate({ to: "/scan/body/new" })}
      onHistory={() => navigate({ to: "/scan/body" })}
    />
  );
}

function ReportLoading({ label }: { label: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-black px-5 text-center text-white">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-neon/10 text-neon">
          <Loader2 className="size-6 animate-spin" />
        </div>
        <p className="mt-4 text-sm font-semibold">{label}</p>
        <p className="mt-1 text-[11px] text-white/40">Opening your private report…</p>
      </div>
    </main>
  );
}

function ReportUnavailable({ label }: { label: string }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pt-5">
      <Link
        to="/scan/body"
        className="grid size-10 place-items-center rounded-full bg-surface"
        aria-label="Back"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <div className="mt-20 rounded-[28px] border border-white/[0.07] bg-surface p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[0.04] text-neon">
          <ScanLine className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold">{label} unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This report could not be opened. It may have been removed or saved in an older format.
        </p>
        <Link
          to="/scan/body/new"
          className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-neon text-sm font-bold text-neon-foreground"
        >
          Start a new Body Scan
        </Link>
      </div>
    </main>
  );
}
