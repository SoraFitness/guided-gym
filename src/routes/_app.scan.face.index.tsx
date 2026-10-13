import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gauge,
  Gem,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  ScanFace,
  Sparkles,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { FaceScanReport, faceBreakdown } from "@/components/scans/FaceScanReport";
import {
  PhotoChecklist,
  ScanPageHeader,
  ScanSampleHero,
  WhatYouGet,
} from "@/components/scans/ScanIntro";
import { scanTrendUpTo } from "@/components/scans/useScanHistory";
import { primaryButtonClass } from "@/components/app/kit";
import { FACE_SCAN_DEMO_PHOTO, FACE_SCAN_DEMO_RESULT } from "@/lib/faceScanDemo";
import { cn } from "@/lib/utils";
import { ScanAnalysisProgress } from "@/components/scans/ScanAnalysisProgress";
import { ScanHistoryList } from "@/components/scans/ScanHistoryList";
import { ScanQuotaCard } from "@/components/scans/ScanQuotaCard";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import { analyzeFaceScan, type FaceScanResult } from "@/lib/faceScan.functions";
import { saveScanSubmission } from "@/lib/scanSubmissions";
import { deleteScanSubmission, listScanSubmissions } from "@/lib/scanSubmissions.functions";
import { getScanQuota, quotaLimitMessage } from "@/lib/scanQuota.functions";
import {
  clearPendingFaceScan,
  getPendingFaceScan,
  savePendingFaceScan,
} from "@/lib/pendingFaceScan";
import { useSubscription } from "@/lib/subscription";

export const Route = createFileRoute("/_app/scan/face/")({
  validateSearch: (search: Record<string, unknown>) => ({
    pending: search.pending === "onboarding" ? ("onboarding" as const) : undefined,
  }),
  head: () => ({ meta: [{ title: "Face Scan — Ascendr" }] }),
  component: FaceScanPage,
});

function FaceScanPage() {
  const navigate = useNavigate();
  const { pending } = Route.useSearch();
  const session = useAuthSession();
  const accountSession = isAccountSession(session) ? session : null;
  const subscription = useSubscription();
  const analyze = useServerFn(analyzeFaceScan);
  const listHistory = useServerFn(listScanSubmissions);
  const deleteSubmission = useServerFn(deleteScanSubmission);
  const loadQuota = useServerFn(getScanQuota);
  const queryClient = useQueryClient();
  const requestLock = useRef(false);
  const pendingLoaded = useRef(false);
  const autoScanStarted = useRef(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [result, setResult] = useState<FaceScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(pending === "onboarding");
  const historyQuery = useQuery({
    queryKey: ["scan-submissions", "face", accountSession?.userId ?? "guest"],
    queryFn: () => listHistory({ data: { scanType: "face" } }),
    enabled: Boolean(accountSession),
  });
  const quotaQuery = useQuery({
    queryKey: ["scan-quota", "face", accountSession?.userId ?? "guest"],
    queryFn: () => loadQuota({ data: { scanType: "face" } }),
    enabled: Boolean(accountSession),
  });
  const weeklyLimitReached = quotaQuery.data?.remaining === 0;

  function changePhoto(next: string | null) {
    if (submissionId && next !== photo) {
      void deleteSubmission({ data: { id: submissionId } }).catch((cleanupError) =>
        console.error("Could not clean up replaced Face Scan:", cleanupError),
      );
    }
    setPhoto(next);
    setSubmissionId(null);
    setResult(null);
    setError(null);
    if (pending === "onboarding") {
      if (next) void savePendingFaceScan(next);
      else void clearPendingFaceScan();
    }
  }

  function reset() {
    setPhoto(null);
    setSubmissionId(null);
    setResult(null);
    setError(null);
    if (pending === "onboarding") void clearPendingFaceScan();
  }

  const runScan = useCallback(
    async (selectedPhoto = photo) => {
      if (!selectedPhoto || session === "loading" || busy) return;
      if (pending === "onboarding" && !subscription.active) {
        navigate({ to: "/paywall", search: { source: "face-scan" } });
        return;
      }
      if (!accountSession) {
        navigate({
          to: "/account",
          search: {
            next: pending === "onboarding" ? "/scan/face?pending=onboarding" : "/scan/face",
          },
        });
        return;
      }
      if (weeklyLimitReached) {
        const message = quotaLimitMessage("face");
        setError(message);
        toast.info(message);
        return;
      }
      if (requestLock.current) return;
      requestLock.current = true;
      setBusy(true);
      setError(null);
      try {
        let currentId = submissionId;
        if (!currentId) {
          const submission = await saveScanSubmission({
            userId: accountSession.userId,
            scanType: "face",
            photos: { face: selectedPhoto },
            status: "ready_for_analysis",
          });
          currentId = submission.id;
          setSubmissionId(currentId);
        }

        const analysis = await analyze({ data: { submissionId: currentId } });
        setResult(analysis);
        if (pending === "onboarding") await clearPendingFaceScan();
        await queryClient.invalidateQueries({ queryKey: ["scan-submissions", "face"] });
        toast.success("Your Face Scan is ready");
      } catch (scanError) {
        console.error(scanError);
        const message =
          scanError instanceof Error
            ? scanError.message
            : "Face analysis couldn't be completed. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        await queryClient.invalidateQueries({ queryKey: ["scan-quota", "face"] });
        requestLock.current = false;
        setBusy(false);
      }
    },
    [
      analyze,
      busy,
      accountSession,
      navigate,
      pending,
      photo,
      queryClient,
      session,
      submissionId,
      subscription.active,
      weeklyLimitReached,
    ],
  );

  useEffect(() => {
    if (pending !== "onboarding" || pendingLoaded.current) return;
    pendingLoaded.current = true;
    let cancelled = false;

    void getPendingFaceScan()
      .then((record) => {
        if (cancelled) return;
        if (record?.photo) {
          setPhoto(record.photo);
          setSubmissionId(record.submissionId ?? null);
        } else setError("Your pending face photo could not be found. Upload it again to continue.");
      })
      .finally(() => {
        if (!cancelled) setPendingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pending]);

  useEffect(() => {
    if (
      pending !== "onboarding" ||
      pendingLoading ||
      !subscription.active ||
      !accountSession ||
      !photo ||
      autoScanStarted.current
    ) {
      return;
    }
    autoScanStarted.current = true;
    void runScan(photo);
  }, [accountSession, pending, pendingLoading, photo, runScan, subscription.active]);

  async function removeScan(id: string) {
    setDeletingId(id);
    try {
      await deleteSubmission({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["scan-submissions", "face"] });
      toast.success("Face Scan deleted");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Couldn't delete the scan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {result && photo ? (
        <FaceScanReport
          key="results"
          photo={photo}
          result={result}
          history={submissionId ? scanTrendUpTo(historyQuery.data, submissionId) : undefined}
          onBack={() => navigate({ to: "/scan" })}
          onReset={reset}
          onHistory={() => {
            reset();
            window.setTimeout(
              () =>
                document
                  .getElementById("face-scan-history")
                  ?.scrollIntoView({ behavior: "smooth" }),
              50,
            );
          }}
        />
      ) : busy && photo ? (
        <ScanAnalysisProgress key="analyzing" photo={photo} scanType="face" />
      ) : (
        <motion.div
          key="upload"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="min-h-dvh"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)" }}
        >
          <div className="mx-auto max-w-md px-4 sm:px-5">
            <ScanPageHeader title="Face Scan" onBack={() => navigate({ to: "/scan" })} />

            <ScanSampleHero
              photo={FACE_SCAN_DEMO_PHOTO}
              fit="contain"
              scoreLabel="Overall appearance score"
              score={FACE_SCAN_DEMO_RESULT.overallScore}
              bars={faceBreakdown(FACE_SCAN_DEMO_RESULT)
                .slice(0, 3)
                .map((item) => ({ label: item.label, score: item.score }))}
              headline="See your face score in seconds."
              onOpenSample={() => navigate({ to: "/scan/face/$id", params: { id: "demo" } })}
            />

            <WhatYouGet
              items={[
                { icon: Gauge, label: "Appearance score" },
                { icon: ScanFace, label: "Feature map" },
                { icon: Gem, label: "Your potential" },
                { icon: Target, label: "Glow-up plan" },
              ]}
            />

            <ScanQuotaCard
              scanType="face"
              quota={quotaQuery.data}
              loading={quotaQuery.isLoading}
              signedIn={Boolean(session && session !== "loading")}
            />

            <div className="mt-5">
              <PhotoSlot
                label="Face photo"
                required
                capture="user"
                value={photo}
                onChange={changePhoto}
                hint="Face forward, fill the frame, and keep your features clearly visible."
                minDimension={400}
              />
            </div>

            <PhotoChecklist items={["Even front light", "Face forward", "No filters or hats"]} />

            {error && (
              <div className="mt-4 rounded-[18px] border border-destructive/25 bg-destructive/10 p-4 text-[14px] text-destructive">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void runScan()}
              disabled={!photo || session === "loading" || busy || weeklyLimitReached}
              className={cn(primaryButtonClass, "mt-6 disabled:opacity-40")}
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : weeklyLimitReached || !accountSession ? (
                <LockKeyhole />
              ) : error ? (
                <RefreshCcw />
              ) : (
                <Sparkles />
              )}
              {busy
                ? "Starting Analysis"
                : weeklyLimitReached
                  ? "Weekly Limit Reached"
                  : !accountSession
                    ? "Sign In to Analyze"
                    : error
                      ? "Try Analysis Again"
                      : "Analyze My Face"}
            </button>

            <p className="mt-3 px-1 text-center text-[12px] text-muted-foreground">
              Subjective and photo-dependent, not a medical or objective assessment.
            </p>

            <div id="face-scan-history" className="scroll-mt-5">
              <ScanHistoryList
                items={historyQuery.data ?? []}
                label="Face"
                deletingId={deletingId}
                onOpen={(id) => navigate({ to: "/scan/face/$id", params: { id } })}
                onDelete={removeScan}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
