import { ArrowLeft, Clock3, LockKeyhole, ScanLine } from "lucide-react";
import type { BodyScanPreviewResult } from "@/lib/bodyScan.functions";

interface LockedBodyScanPreviewProps {
  photo: string;
  preview: BodyScanPreviewResult;
  onUnlock: () => void;
  onRetry: () => void;
}

function LockedValue({ className = "w-16" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-5 rounded-md border border-white/[0.06] bg-white/[0.10] blur-[3px] ${className}`}
    />
  );
}

export function LockedBodyScanPreview({
  photo,
  preview,
  onUnlock,
  onRetry,
}: LockedBodyScanPreviewProps) {
  const previewMetrics = [
    { label: "Muscle", score: preview.metrics.muscle },
    { label: "V-taper", score: preview.metrics.vTaper },
    { label: "Symmetry", score: preview.metrics.symmetry },
    { label: "Potential", score: preview.metrics.potential },
    { label: "Shoulders", score: preview.metrics.shoulders },
    { label: "Core", score: preview.metrics.core },
  ] as const;

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] pb-4">
      <section className="relative min-h-[clamp(32rem,72dvh,39rem)] overflow-hidden rounded-[32px] border border-white/[0.10] bg-black shadow-[0_28px_80px_-30px_rgba(0,0,0,0.95)]">
        <img
          src={photo}
          alt="Your uploaded Body Scan photo"
          className="absolute inset-0 h-full w-full object-cover object-top opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black via-black/90 to-transparent" />
        <div className="pointer-events-none absolute -right-20 top-16 size-60 rounded-full bg-neon/[0.06] blur-3xl" />

        <div className="relative z-10 flex min-h-[clamp(32rem,72dvh,39rem)] flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-xl transition active:scale-95"
              aria-label="Use a different photo"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="flex items-center gap-1.5 rounded-full border border-neon/25 bg-black/60 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-neon backdrop-blur-xl">
              <span className="size-1.5 rounded-full bg-neon shadow-[0_0_8px_var(--neon)]" />
              Ascendr Vision
            </span>
          </div>

          <div className="mt-auto">
            <div className="mb-3 flex items-end justify-between gap-3 px-1">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-neon">
                  Body Scan Report
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-white/55">
                  <Clock3 className="size-3 text-neon" /> Today
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-white/55 backdrop-blur-xl">
                <LockKeyhole className="size-3 text-neon" /> Private
              </span>
            </div>

            <button
              type="button"
              onClick={onUnlock}
              aria-label="Unlock your Body Scan results"
              className="group relative w-full overflow-hidden rounded-[28px] border border-neon/20 bg-black/80 p-4 text-left shadow-[0_22px_65px_-30px_var(--neon)] backdrop-blur-2xl transition active:scale-[0.99] sm:p-5"
            >
              <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-neon/[0.08] blur-3xl" />
              <div className="relative flex items-end justify-between gap-4 border-b border-white/[0.07] pb-3">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/45">
                    Overall physique rating
                  </p>
                  <div className="mt-1 flex items-end gap-1.5">
                    <span className="text-[2.75rem] font-black leading-none tracking-[-0.07em] text-white">
                      {preview.overallScore}
                    </span>
                    <span className="mb-1 text-[9px] font-black text-neon">/100</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-neon/20 bg-neon/[0.07] px-3 py-2 text-right">
                  <LockedValue className="ml-auto w-14" />
                  <p className="mt-1.5 text-[7px] font-black uppercase tracking-[0.15em] text-white/40">
                    Body fat range
                  </p>
                </div>
              </div>

              <div className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                {previewMetrics.map((metric) => (
                  <div key={metric.label} className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[7px] font-black uppercase tracking-[0.13em] text-white/45">
                        {metric.label}
                      </p>
                      <LockKeyhole className="size-3 shrink-0 text-neon/75" />
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-neon shadow-[0_0_8px_rgba(163,255,68,.45)]"
                        style={{ width: `${metric.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-neon/15 bg-neon/[0.06] px-3.5 py-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-neon/10 text-neon">
                  <LockKeyhole className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-neon">
                    Your next move
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-white/50">
                    Unlock your personalized improvement plan
                  </p>
                </div>
              </div>

              <div className="relative mt-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-neon">
                <ScanLine className="size-3.5" /> Tap to unlock the full report
              </div>
            </button>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onUnlock}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon font-bold text-neon-foreground glow-neon transition active:scale-[0.98]"
      >
        <LockKeyhole className="size-5" /> Unlock My Body Scan
      </button>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 flex h-10 w-full items-center justify-center text-xs font-semibold text-muted-foreground transition hover:text-foreground"
      >
        Use a different photo
      </button>
    </div>
  );
}
