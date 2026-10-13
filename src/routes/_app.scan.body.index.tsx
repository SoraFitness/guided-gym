import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Droplet, Dumbbell, Gauge, Loader2, ScanLine, ShieldCheck, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ScanHistoryList } from "@/components/scans/ScanHistoryList";
import { bodyBreakdown } from "@/components/scans/BodyScanReport";
import { ScanPageHeader, ScanSampleHero, WhatYouGet } from "@/components/scans/ScanIntro";
import { primaryButtonClass } from "@/components/app/kit";
import { BODY_SCAN_DEMO_PHOTO, BODY_SCAN_DEMO_RESULT } from "@/lib/bodyScanDemo";
import { cn } from "@/lib/utils";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import { deleteScanSubmission, listScanSubmissions } from "@/lib/scanSubmissions.functions";

export const Route = createFileRoute("/_app/scan/body/")({
  head: () => ({ meta: [{ title: "Body Scan — Ascendr" }] }),
  component: BodyScanIntro,
});

function BodyScanIntro() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const accountSession = isAccountSession(session) ? session : null;
  const listHistory = useServerFn(listScanSubmissions);
  const deleteSubmission = useServerFn(deleteScanSubmission);
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const historyQuery = useQuery({
    queryKey: ["scan-submissions", "body", accountSession?.userId ?? "guest"],
    queryFn: () => listHistory({ data: { scanType: "body" } }),
    enabled: Boolean(accountSession),
  });

  async function removeScan(id: string) {
    setDeletingId(id);
    try {
      await deleteSubmission({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["scan-submissions", "body"] });
      toast.success("Body Scan deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the scan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-12 sm:px-5">
      <ScanPageHeader title="Body Scan" onBack={() => navigate({ to: "/scan" })} />

      <ScanSampleHero
        photo={BODY_SCAN_DEMO_PHOTO}
        scoreLabel="Overall physique score"
        score={BODY_SCAN_DEMO_RESULT.overallScore}
        bars={bodyBreakdown(BODY_SCAN_DEMO_RESULT)
          .slice(0, 3)
          .map((item) => ({ label: item.label, score: item.score ?? 0 }))}
        headline="Turn one photo into your physique score."
        onOpenSample={() => navigate({ to: "/scan/body/$id", params: { id: "demo" } })}
      />

      <WhatYouGet
        items={[
          { icon: Gauge, label: "Physique score" },
          { icon: Dumbbell, label: "9-muscle heatmap" },
          { icon: Droplet, label: "Body-fat range" },
          { icon: Target, label: "Your action plan" },
        ]}
      />

      <button
        type="button"
        onClick={() => navigate({ to: "/scan/body/new", search: { pending: undefined } })}
        className={cn(primaryButtonClass, "mt-5")}
      >
        <ScanLine /> Start Body Scan
      </button>

      {historyQuery.isLoading && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-[24px] border border-hairline bg-surface py-8 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your history
        </div>
      )}

      <ScanHistoryList
        items={historyQuery.data ?? []}
        label="Body"
        deletingId={deletingId}
        onOpen={(id) => navigate({ to: "/scan/body/$id", params: { id } })}
        onDelete={removeScan}
      />

      <div className="mt-8 flex items-start gap-3 px-1">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Photos and reports stay in your private account. Results are visual opinions, not medical
          or body-composition measurements.
        </p>
      </div>
    </div>
  );
}
