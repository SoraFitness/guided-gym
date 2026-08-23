import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, ScanFace } from "lucide-react";
import { FaceScanReport } from "@/components/scans/FaceScanReport";
import { parseFaceScanResult } from "@/lib/faceScan.functions";
import {
  FACE_SCAN_DEMO_DATE,
  FACE_SCAN_DEMO_PHOTO,
  FACE_SCAN_DEMO_RESULT,
} from "@/lib/faceScanDemo";
import { getScanSubmission } from "@/lib/scanSubmissions.functions";

export const Route = createFileRoute("/_app/scan/face/$id")({
  head: () => ({ meta: [{ title: "Face Scan Report — Ascendr" }] }),
  component: FaceScanDetail,
});

function FaceScanDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getSubmission = useServerFn(getScanSubmission);
  const demo = id === "demo";
  const detailQuery = useQuery({
    queryKey: ["scan-submission", "face", id],
    queryFn: () => getSubmission({ data: { id, scanType: "face" } }),
    enabled: !demo,
    retry: false,
  });

  if (demo) {
    return (
      <FaceScanReport
        photo={FACE_SCAN_DEMO_PHOTO}
        result={FACE_SCAN_DEMO_RESULT}
        createdAt={FACE_SCAN_DEMO_DATE}
        demo
        onBack={() => navigate({ to: "/scan/face", search: { pending: undefined } })}
        onReset={() => navigate({ to: "/scan/face", search: { pending: undefined } })}
        onHistory={() => navigate({ to: "/scan/face", search: { pending: undefined } })}
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black px-5 text-center text-white">
        <div>
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-neon/10 text-neon">
            <Loader2 className="size-6 animate-spin" />
          </div>
          <p className="mt-4 text-sm font-semibold">Loading your Face Scan</p>
          <p className="mt-1 text-[11px] text-white/40">Opening your private report…</p>
        </div>
      </main>
    );
  }

  const result = detailQuery.data ? parseFaceScanResult(detailQuery.data.analysis) : null;
  if (detailQuery.isError || !detailQuery.data || !result || !detailQuery.data.photoUrl) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-4 page-pt-safe page-pb-safe sm:px-5">
        <Link
          to="/scan/face"
          search={{ pending: undefined }}
          className="grid size-10 place-items-center rounded-full bg-surface"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="mt-20 rounded-[28px] border border-white/[0.07] bg-surface p-7 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[0.04] text-neon">
            <ScanFace className="size-6" />
          </div>
          <h1 className="mt-5 text-xl font-bold">Face Scan unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            This report could not be opened. It may have been removed or saved in an older format.
          </p>
          <Link
            to="/scan/face"
            search={{ pending: undefined }}
            className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-neon text-sm font-bold text-neon-foreground"
          >
            Start a new Face Scan
          </Link>
        </div>
      </main>
    );
  }

  return (
    <FaceScanReport
      photo={detailQuery.data.photoUrl}
      result={result}
      createdAt={detailQuery.data.analyzedAt ?? detailQuery.data.createdAt}
      onBack={() => navigate({ to: "/scan/face", search: { pending: undefined } })}
      onReset={() => navigate({ to: "/scan/face", search: { pending: undefined } })}
      onHistory={() => navigate({ to: "/scan/face", search: { pending: undefined } })}
    />
  );
}
