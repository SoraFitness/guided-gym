// Internal marketing Face Scan.
//
// A copy of the member Face Scan flow (/scan/face): same uploader, same
// analysis, same report screen. Two deliberate differences:
//   * the report and its export carry the marketing watermark, and
//   * the scan is never written to the operator's history and never claims
//     weekly quota — scanning other people must not pollute the operator's own
//     progress baseline, which their future scans are compared against.
// Access is restricted to the staff allowlist, enforced on the server.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { FaceScanReport } from "@/components/scans/FaceScanReport";
import { ScanAnalysisProgress } from "@/components/scans/ScanAnalysisProgress";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import type { FaceScanResult } from "@/lib/faceScan.functions";
import { analyzeMarketingFaceScan } from "@/lib/marketingScan.functions";
import { shrinkPhotoForScan } from "@/lib/marketingPhoto";

export const Route = createFileRoute("/admin/face-scan")({
  head: () => ({ meta: [{ title: "Marketing Face Scan — Ascendr" }] }),
  component: MarketingFaceScan,
});

function MarketingFaceScan() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const accountSession = isAccountSession(session) ? session : null;
  const analyze = useServerFn(analyzeMarketingFaceScan);
  const requestLock = useRef(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<FaceScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changePhoto(next: string | null) {
    setPhoto(next);
    setResult(null);
    setError(null);
  }

  function reset() {
    setPhoto(null);
    setResult(null);
    setError(null);
  }

  const runScan = useCallback(
    async (selectedPhoto = photo) => {
      if (!selectedPhoto || session === "loading" || busy) return;
      if (!accountSession) {
        navigate({ to: "/account", search: { next: "/admin/face-scan" } });
        return;
      }
      if (requestLock.current) return;
      requestLock.current = true;

      setBusy(true);
      setError(null);
      try {
        const compact = await shrinkPhotoForScan(selectedPhoto);
        const analysis = await analyze({ data: { photo: compact } });
        setResult(analysis);
        toast.success("Marketing scan ready");
      } catch (scanError) {
        console.error(scanError);
        const message =
          scanError instanceof Error
            ? scanError.message
            : "Face analysis couldn't be completed. Please try again.";
        setError(message);
        toast.error(message);
      } finally {
        requestLock.current = false;
        setBusy(false);
      }
    },
    [accountSession, analyze, busy, navigate, photo, session],
  );

  return (
    <AnimatePresence mode="wait">
      {result && photo ? (
        <FaceScanReport
          key="results"
          photo={photo}
          result={result}
          watermark="marketing"
          onBack={() => navigate({ to: "/home" })}
          onReset={reset}
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
              onClick={() => navigate({ to: "/home" })}
              className="grid size-10 place-items-center rounded-full bg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neon">
                Staff tool · marketing
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

            <div className="mt-4 rounded-[22px] border border-neon/20 bg-neon/[0.06] p-4">
              <p className="text-[11px] font-semibold text-neon">Marketing export</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Same scan members get. The report shows the Ascendr banner and saving produces the
                card with the large brand band. Photo quality checks are off, nothing is added to
                your scan history, and no weekly scans are used.
              </p>
              <Link
                to="/admin/scan"
                className="mt-3 inline-flex h-9 items-center rounded-full border border-white/[0.1] bg-white/[0.05] px-3 text-[11px] font-bold text-white/80"
              >
                Switch to Body Scan
              </Link>
            </div>

            <div className="mt-5">
              <PhotoSlot
                label="Face photo"
                required
                capture="user"
                value={photo}
                onChange={changePhoto}
                // Staff tool: accept whatever photo is to hand. The member flow
                // keeps its quality gates.
                minDimension={0}
                maxBytes={Number.POSITIVE_INFINITY}
                hint="Any face photo works here — quality checks are off for marketing scans."
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
                Get permission before scanning someone and before posting their photo.
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
              disabled={!photo || session === "loading" || busy}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon font-bold text-neon-foreground disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : !accountSession ? (
                <LockKeyhole className="size-5" />
              ) : error ? (
                <RefreshCcw className="size-5" />
              ) : (
                <Sparkles className="size-5" />
              )}
              {busy
                ? "Starting Analysis"
                : !accountSession
                  ? "Sign In to Analyze"
                  : error
                    ? "Try Analysis Again"
                    : "Analyze Face"}
            </button>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
