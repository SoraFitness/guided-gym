import { motion } from "framer-motion";
import { ArrowLeft, Droplet, LockKeyhole, Mountain } from "lucide-react";
import type { BodyScanPreviewResult } from "@/lib/bodyScan.functions";
import { AnatomyPair, type AnatomyFills } from "@/components/app/AnatomyFigure";
import { cardClass, primaryButtonClass, scoreColor, scoreTier } from "@/components/app/kit";
import { cn } from "@/lib/utils";

interface LockedBodyScanPreviewProps {
  photo: string;
  preview: BodyScanPreviewResult;
  onUnlock: () => void;
  onRetry: () => void;
}

function LockedNumber() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1">
      <span className="block h-4 w-7 rounded-md bg-white/25 blur-[4px]" />
      <LockKeyhole className="size-3.5 text-muted-foreground" />
    </span>
  );
}

export function LockedBodyScanPreview({
  photo,
  preview,
  onUnlock,
  onRetry,
}: LockedBodyScanPreviewProps) {
  const metrics = [
    { label: "Muscle", score: preview.metrics.muscle },
    { label: "V-Taper", score: preview.metrics.vTaper },
    { label: "Symmetry", score: preview.metrics.symmetry },
    { label: "Potential", score: preview.metrics.potential },
    { label: "Shoulders", score: preview.metrics.shoulders },
    { label: "Core", score: preview.metrics.core },
  ];
  const teaserFills: AnatomyFills = {
    shoulders: scoreColor(preview.metrics.shoulders),
    traps: scoreColor(preview.metrics.shoulders),
    abs: scoreColor(preview.metrics.core),
    obliques: scoreColor(preview.metrics.core),
    chest: scoreColor(preview.metrics.muscle),
    lats: scoreColor(preview.metrics.vTaper),
    quads: scoreColor(preview.metrics.muscle),
    biceps: scoreColor(preview.metrics.muscle),
  };

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="-ml-2 grid size-11 place-items-center rounded-full active:bg-white/[0.06]"
            aria-label="Use a different photo"
          >
            <ArrowLeft className="size-6" />
          </button>
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">Your Body Score</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-muted-foreground">
          <LockKeyhole className="size-3.5" /> Private
        </span>
      </div>

      <button
        type="button"
        onClick={onUnlock}
        aria-label="Unlock your Body Scan results"
        className="relative mt-3 block w-full overflow-hidden rounded-[28px] border border-hairline bg-black text-left transition active:scale-[0.99]"
      >
        <img
          src={photo}
          alt="Your uploaded Body Scan photo"
          className="h-[400px] w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent via-45% to-black/95" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/85">
            Overall physique score
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[80px] font-bold leading-[0.85] tracking-[-0.05em]"
              style={{ color: scoreColor(preview.overallScore) }}
            >
              {preview.overallScore}
            </motion.span>
            <span className="text-[22px] font-semibold text-white/85">/100</span>
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-[14px] font-semibold backdrop-blur-md">
              <Mountain className="size-4" /> Lvl {scoreTier(preview.overallScore).level} ·{" "}
              {scoreTier(preview.overallScore).label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/45 px-3 py-1.5 text-[14px] font-semibold backdrop-blur-md">
              <Droplet className="size-4" />
              <span className="block h-3.5 w-10 rounded bg-white/30 blur-[3px]" /> body fat
            </span>
          </div>
        </div>
      </button>

      <p className="mb-3 mt-6 px-1 text-[20px] font-bold tracking-[-0.02em]">Breakdown</p>
      <button
        type="button"
        onClick={onUnlock}
        aria-label="Unlock your score breakdown"
        className={cn(cardClass, "grid w-full grid-cols-2 gap-x-6 gap-y-5 p-5 text-left")}
      >
        {metrics.map((metric, index) => (
          <div key={metric.label} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14px] font-medium text-foreground/85">
                {metric.label}
              </span>
              <LockedNumber />
            </div>
            <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.score}%` }}
                transition={{ duration: 0.8, delay: index * 0.06 }}
                className="h-full rounded-full"
                style={{ backgroundColor: scoreColor(metric.score) }}
              />
            </div>
          </div>
        ))}
      </button>

      <p className="mb-3 mt-6 px-1 text-[20px] font-bold tracking-[-0.02em]">Muscle map</p>
      <button
        type="button"
        onClick={onUnlock}
        aria-label="Unlock your muscle map"
        className={cn(cardClass, "relative block w-full overflow-hidden p-5")}
      >
        <AnatomyPair
          fills={teaserFills}
          className="mx-auto max-w-[260px] blur-[6px]"
          figureClassName="max-h-[190px]"
          captions={false}
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2.5 text-[14px] font-semibold backdrop-blur-md">
            <LockKeyhole className="size-4 text-neon" /> 9-muscle heatmap
          </span>
        </span>
      </button>

      <button type="button" onClick={onUnlock} className={cn(primaryButtonClass, "mt-5")}>
        <LockKeyhole /> Unlock my full report
      </button>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 flex h-11 w-full items-center justify-center text-[14px] font-semibold text-muted-foreground transition hover:text-foreground"
      >
        Use a different photo
      </button>
    </div>
  );
}
