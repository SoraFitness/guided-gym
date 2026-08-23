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
  ScanLine,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { BodyScanReport } from "@/components/scans/BodyScanReport";
import { ScanAnalysisProgress } from "@/components/scans/ScanAnalysisProgress";
import { ScanQuotaCard } from "@/components/scans/ScanQuotaCard";
import { SoftAccountPrompt } from "@/components/SoftAccountPrompt";
import { useAuthSession } from "@/lib/authSession";
import { analyzeBodyScan, type BodyScanAiResult } from "@/lib/bodyScan.functions";
import { saveScanSubmission } from "@/lib/scanSubmissions";
import { deleteScanSubmission } from "@/lib/scanSubmissions.functions";
import {
  clearPendingBodyScan,
  getPendingBodyScan,
  savePendingBodyScan,
} from "@/lib/pendingBodyScan";
import { useSubscription } from "@/lib/subscription";
import { getScanQuota, quotaLimitMessage } from "@/lib/scanQuota.functions";

export const Route = createFileRoute("/_app/scan/body/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    pending: search.pending === "onboarding" ? ("onboarding" as const) : undefined,
  }),
  head: () => ({ meta: [{ title: "New Body Scan — Ascendr" }] }),
  component: NewBodyScan,
});

function NewBodyScan() {
  const navigate = useNavigate();
  const { pending } = Route.useSearch();
  const session = useAuthSession();
  const subscription = useSubscription();
  const analyze = useServerFn(analyzeBodyScan);
  const deleteSubmission = useServerFn(deleteScanSubmission);
  const loadQuota = useServerFn(getScanQuota);
  const queryClient = useQueryClient();
  const requestLock = useRef(false);
  const pendingLoaded = useRef(false);
  const autoScanStarted = useRef(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [result, setResult] = useState<BodyScanAiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(pending === "onboarding");
  const pendingLocked = pending === "onboarding" && !subscription.active;
  const quotaQuery = useQuery({
    queryKey: ["scan-quota", "body", session && session !== "loading" ? session.userId : "guest"],
    queryFn: () => loadQuota({ data: { scanType: "body" } }),
    enabled: Boolean(session && session !== "loading"),
  });
  const weeklyLimitReached = quotaQuery.data?.remaining === 0;

  function changePhoto(next: string | null) {
    if (submissionId && next !== photo) {
      void deleteSubmission({ data: { id: submissionId } }).catch((cleanupError) =>
        console.error("Could not clean up replaced Body Scan:", cleanupError),
      );
    }
    setPhoto(next);
    setSubmissionId(null);
    setResult(null);
    setError(null);
    if (pending === "onboarding") {
      if (next) void savePendingBodyScan(next);
      else void clearPendingBodyScan();
    }
  }

  function reset() {
    setPhoto(null);
    setSubmissionId(null);
    setResult(null);
    setError(null);
    if (pending === "onboarding") void clearPendingBodyScan();
  }

  const runScan = useCallback(
    async (selectedPhoto = photo) => {
      if (!selectedPhoto || session === "loading" || busy) return;
      if (pending === "onboarding" && !subscription.active) {
        navigate({ to: "/paywall", search: { source: "body-scan" } });
        return;
      }
      if (!session) {
        const message = "Sign in or create an account first so we can save and analyze your scan.";
        setError(message);
        toast.info(message);
        document
          .getElementById("body-scan-account")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (weeklyLimitReached) {
        const message = quotaLimitMessage("body");
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
            userId: session.userId,
            scanType: "body",
            photos: { body: selectedPhoto },
            status: "ready_for_analysis",
          });
          currentId = submission.id;
          setSubmissionId(currentId);
        }

        const analysis = await analyze({ data: { submissionId: currentId } });
        setResult(analysis);
        if (pending === "onboarding") await clearPendingBodyScan();
        await queryClient.invalidateQueries({ queryKey: ["scan-submissions", "body"] });
        toast.success(
          analysis.comparison?.basis === "exact_match"
            ? "Same photo detected — your original scores were reused"
            : "Your Body Scan is ready",
        );
      } catch (scanError) {
        console.error(scanError);
        const message =
          scanError instanceof Error
            ? scanError.message
            : "Body analysis couldn't be completed. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        await queryClient.invalidateQueries({ queryKey: ["scan-quota", "body"] });
        requestLock.current = false;
        setBusy(false);
      }
    },
    [
      analyze,
      busy,
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

    void getPendingBodyScan()
      .then((record) => {
        if (cancelled) return;
        if (record?.photo) {
          setPhoto(record.photo);
          setSubmissionId(record.submissionId ?? null);
        } else setError("Your pending photo could not be found. Upload it again to continue.");
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
      !session ||
      session === "loading" ||
      !photo ||
      autoScanStarted.current
    ) {
      return;
    }
    autoScanStarted.current = true;
    void runScan(photo);
  }, [pending, pendingLoading, photo, runScan, session, subscription.active]);

  return (
    <AnimatePresence mode="wait">
      {result && photo ? (
        <BodyScanReport
          key="results"
          photo={photo}
          result={result}
          onBack={() => navigate({ to: "/scan" })}
          onReset={reset}
          onHistory={() => navigate({ to: "/scan/body" })}
        />
      ) : busy && photo ? (
        <ScanAnalysisProgress key="analyzing" photo={photo} scanType="body" />
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
              onClick={() => navigate({ to: "/scan/body" })}
              className="grid h-[44px] w-[44px] place-items-center rounded-full bg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neon">
                AI physique analysis
              </p>
              <p className="text-sm font-semibold">Body Scan</p>
            </div>
          </header>

          <main className="mx-auto max-w-md px-5 pt-6">
            <div className="relative overflow-hidden rounded-[30px] border border-neon/15 bg-gradient-to-br from-neon/[0.14] via-surface to-black p-6">
              <div className="absolute -right-8 -top-8 size-36 rounded-full bg-neon/10 blur-3xl" />
              <div className="relative grid size-14 place-items-center rounded-2xl bg-neon/15 text-neon">
                <ScanLine className="size-7" />
              </div>
              <h1 className="relative mt-8 text-3xl font-bold leading-tight">
                See your physique potential.
              </h1>
              <p className="relative mt-3 text-sm leading-relaxed text-muted-foreground">
                Upload one clear full-body photo for a personalized AI report covering physique,
                nine distinct muscle groups, body-fat range, V-taper, symmetry, and potential.
              </p>
              <div className="relative mt-5 flex flex-wrap gap-2">
                {["9 muscle groups", "Strong areas", "Action plan"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {session === null && (
              <div id="body-scan-account" className="mt-5 scroll-mt-5">
                <SoftAccountPrompt
                  title="Save your scan privately"
                  description="Create or sign in to your Ascendr account before uploading. Your photo and AI report will be saved to your private cloud account."
                  redirectPath={
                    pending === "onboarding"
                      ? "/scan/body/new?pending=onboarding"
                      : "/scan/body/new"
                  }
                  storageKey="fitness:body-scan-account-required"
                  dismissible={false}
                  primaryLabel="Create account or sign in"
                />
              </div>
            )}

            <ScanQuotaCard
              scanType="body"
              quota={quotaQuery.data}
              loading={quotaQuery.isLoading}
              signedIn={Boolean(session && session !== "loading")}
            />

            <div className="mt-5">
              <PhotoSlot
                label="Full-body photo"
                required
                capture="environment"
                value={photo}
                onChange={changePhoto}
                hint="Take one still photo with your full body visible from head to toe and the camera level."
              />
            </div>

            <div className="mt-4 rounded-[22px] border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center gap-2">
                <LockKeyhole className="size-4 text-neon" />
                <p className="text-xs font-semibold">Photo quality checklist</p>
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  "Head-to-toe in frame",
                  "Level camera and even lighting",
                  "Natural stance in fitted gymwear",
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
                Results are a visual fitness opinion, not a medical or body-composition measurement.
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
              disabled={
                !photo || session === "loading" || busy || pendingLoading || weeklyLimitReached
              }
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon font-bold text-neon-foreground disabled:opacity-40"
            >
              {busy || pendingLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : pendingLocked || weeklyLimitReached ? (
                <LockKeyhole className="size-5" />
              ) : session === null ? (
                <LockKeyhole className="size-5" />
              ) : error ? (
                <RefreshCcw className="size-5" />
              ) : (
                <Sparkles className="size-5" />
              )}
              {busy
                ? "Starting Analysis"
                : pendingLoading
                  ? "Loading Your Photo"
                  : weeklyLimitReached
                    ? "Weekly Limit Reached"
                    : pendingLocked
                      ? "Unlock to Analyze"
                      : session === null
                        ? "Sign In to Analyze"
                        : error
                          ? "Try Analysis Again"
                          : "Analyze My Physique"}
            </button>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
