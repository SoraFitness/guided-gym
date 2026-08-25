import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  ScanFace,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { FaceScanReport } from "@/components/scans/FaceScanReport";
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
          <header
            className="mx-auto flex max-w-md items-center gap-3 px-5"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
          >
            <button
              type="button"
              onClick={() => navigate({ to: "/scan" })}
              className="grid size-10 place-items-center rounded-full bg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neon">
                AI appearance analysis
              </p>
              <p className="text-sm font-semibold">Face Scan</p>
            </div>
          </header>

          <main className="mx-auto max-w-md px-5 pt-6">
            <div className="relative overflow-hidden rounded-[30px] border border-neon/15 bg-gradient-to-br from-neon/[0.14] via-surface to-black p-6">
              <div className="absolute -right-8 -top-8 size-36 rounded-full bg-neon/10 blur-3xl" />
              <div className="relative grid size-14 place-items-center rounded-2xl bg-neon/15 text-neon">
                <ScanFace className="size-7" />
              </div>
              <h1 className="relative mt-8 text-3xl font-bold leading-tight">
                See your facial potential.
              </h1>
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
                Upload one clear face photo for a personalized AI report covering appearance,
                symmetry, jawline, skin, eye area, and looksmax potential.
              </p>
              <div className="relative mt-5 flex flex-wrap gap-2">
                {["6 scores", "Strong features", "Action plan"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate({ to: "/scan/face/$id", params: { id: "demo" } })}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] text-sm font-bold text-white/70 transition active:scale-[0.985]"
            >
              <ScanFace className="size-4 text-neon" /> View sample report
            </button>

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

            <div className="mt-4 rounded-[22px] border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center gap-2">
                <LockKeyhole className="size-4 text-neon" />
                <p className="text-xs font-semibold">Photo quality checklist</p>
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  "Even front lighting",
                  "Neutral, front-facing angle",
                  "No filters, glasses, or hats",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <CheckCircle2 className="size-3.5 text-neon" /> {item}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                Results are subjective and photo-dependent, not a medical or objective assessment.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void runScan()}
              disabled={!photo || session === "loading" || busy || weeklyLimitReached}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon font-bold text-neon-foreground disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : weeklyLimitReached || !accountSession ? (
                <LockKeyhole className="size-5" />
              ) : error ? (
                <RefreshCcw className="size-5" />
              ) : (
                <Sparkles className="size-5" />
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

            <div id="face-scan-history" className="scroll-mt-5">
              <ScanHistoryList
                items={historyQuery.data ?? []}
                label="Face"
                deletingId={deletingId}
                onOpen={(id) => navigate({ to: "/scan/face/$id", params: { id } })}
                onDelete={removeScan}
              />
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
