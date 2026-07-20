import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock3,
  History,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { MuscleGroupBreakdown } from "@/components/bodyscan/MuscleGroupBreakdown";
import type { BodyScanAiResult } from "@/lib/bodyScan.functions";

interface BodyScanReportProps {
  photo: string;
  result: BodyScanAiResult;
  createdAt?: string | null;
  onBack: () => void;
  onReset?: () => void;
  onHistory?: () => void;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.82) return "High photo confidence";
  if (confidence >= 0.64) return "Good photo confidence";
  return "Limited photo confidence";
}

export function BodyScanReport({
  photo,
  result,
  createdAt,
  onBack,
  onReset,
  onHistory,
}: BodyScanReportProps) {
  const metrics = [
    { label: "Muscle Development", metric: result.muscleDevelopment },
    { label: "V-Taper", metric: result.vTaper },
    { label: "Symmetry", metric: result.symmetry },
    { label: "Potential", metric: result.potential, featured: true },
  ];
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-dvh bg-black pb-10 text-white"
    >
      <section className="relative min-h-[82dvh] overflow-hidden">
        <img
          src={photo}
          alt="Your Body Scan"
          className="absolute inset-0 h-full w-full object-cover object-top opacity-42"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,transparent_0%,rgba(0,0,0,0.18)_30%,rgba(0,0,0,0.94)_90%)]" />

        <header className="relative z-10 mx-auto flex max-w-md items-center justify-between px-5 pt-5">
          <button
            type="button"
            onClick={onBack}
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/55 backdrop-blur-xl"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span className="rounded-full border border-neon/25 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-neon backdrop-blur-xl">
            Body Scan Report
          </span>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[74dvh] max-w-md flex-col justify-end px-5 pb-7">
          <div className="rounded-[28px] border border-white/10 bg-black/68 p-5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/55">
                  Overall physique
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-7xl font-black leading-none tracking-[-0.07em]">
                    {result.overallScore}
                  </span>
                  <span className="pb-1 text-sm font-bold text-neon">/ 100</span>
                </div>
              </div>
              <div className="mb-1 rounded-2xl border border-neon/20 bg-neon/10 px-3 py-2 text-right">
                <p className="text-lg font-black text-neon">{confidencePercent}%</p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-white/45">
                  Confidence
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/75">{result.overallSummary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[9px] font-semibold text-white/65">
                {confidenceLabel(result.confidence)}
              </span>
              <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[9px] font-semibold text-white/65">
                Body fat {result.bodyFatEstimate.lowPercent}–{result.bodyFatEstimate.highPercent}%
              </span>
              {createdAt && (
                <span className="flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[9px] font-semibold text-white/65">
                  <Clock3 className="size-3" />
                  {new Date(createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-md space-y-4 px-5">
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-5">
          <div className="flex items-center gap-2 text-neon">
            <Target className="size-4" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Physique readout</h2>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">
            Scores reflect visible presentation in this photo. Repeat the same pose, distance, and
            lighting when comparing future scans.
          </p>

          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/65">
                  Body Fat Estimate
                </p>
                <p className="mt-1 text-[9px] text-white/35">Broad visual range</p>
              </div>
              <p className="text-2xl font-black leading-none text-neon">
                {result.bodyFatEstimate.lowPercent}–{result.bodyFatEstimate.highPercent}%
              </p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/55">
              {result.bodyFatEstimate.insight}
            </p>
          </div>

          <div className="mt-3 space-y-3">
            {metrics.map(({ label, metric, featured }, index) => (
              <BodyMetricCard
                key={label}
                label={label}
                score={metric.score}
                insight={metric.insight}
                featured={featured}
                delay={index * 0.05}
              />
            ))}
          </div>
        </section>

        <MuscleGroupBreakdown muscleGroups={result.muscleGroups} />

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.045] p-5">
          <div className="flex items-center gap-2 text-neon">
            <Sparkles className="size-4" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
              Strongest visible areas
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {result.strongestAreas.map((area) => (
              <div key={area} className="flex items-start gap-3 text-sm text-white/80">
                <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-neon/15 text-neon">
                  <Check className="size-3" />
                </div>
                <span className="leading-relaxed">{area}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-neon/15 bg-neon/[0.055] p-5">
          <div className="flex items-center gap-2 text-neon">
            <WandSparkles className="size-4" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
              Highest-impact actions
            </h2>
          </div>
          <div className="mt-5 space-y-5">
            {result.actionPlan.map((action, index) => (
              <div key={`${action.title}-${index}`} className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-neon font-black text-neon-foreground">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{action.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{action.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neon" />
          <p className="text-[10px] leading-relaxed text-white/45">
            This is a subjective visual fitness opinion from one photo—not a medical or
            body-composition measurement. Pose, pump, clothing, lighting, and camera angle can
            change every score and estimated range.
          </p>
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black"
          >
            <RefreshCcw className="size-4" /> New Body Scan
          </button>
        )}
        {onHistory && (
          <button
            type="button"
            onClick={onHistory}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white/55"
          >
            <History className="size-4" /> View scan history
          </button>
        )}
      </div>
    </motion.main>
  );
}

function BodyMetricCard({
  label,
  score,
  insight,
  featured,
  delay,
}: {
  label: string;
  score: number;
  insight: string;
  featured?: boolean;
  delay: number;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        featured ? "border-neon/20 bg-neon/[0.055]" : "border-white/[0.06] bg-black/20"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/65">{label}</p>
        <p className="text-2xl font-black leading-none text-neon">{score}</p>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.75, delay }}
          className="h-full rounded-full bg-neon"
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/55">{insight}</p>
    </div>
  );
}
