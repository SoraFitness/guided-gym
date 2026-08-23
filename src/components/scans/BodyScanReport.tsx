import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock3,
  Download,
  GitCompareArrows,
  History,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MuscleGroupBreakdown } from "@/components/bodyscan/MuscleGroupBreakdown";
import type { BodyScanAiResult } from "@/lib/bodyScan.functions";

interface BodyScanReportProps {
  photo: string;
  result: BodyScanAiResult;
  createdAt?: string | null;
  demo?: boolean;
  onBack: () => void;
  onReset?: () => void;
  onHistory?: () => void;
}

interface ReportMetric {
  label: string;
  shortLabel: string;
  score: number | null;
  insight: string;
  featured?: boolean;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.82) return "High photo confidence";
  if (confidence >= 0.64) return "Good photo confidence";
  return "Limited photo confidence";
}

function comparisonCopy(comparison: BodyScanAiResult["comparison"]) {
  if (!comparison || comparison.status === "baseline") {
    return {
      eyebrow: "Baseline locked",
      title: "Your starting point is saved.",
      body: "Future scans will be compared conservatively against this result so ordinary lighting and pose differences do not become fake progress.",
      badge: "Scan 01",
      accent: false,
    };
  }
  if (comparison.basis === "exact_match") {
    return {
      eyebrow: "Consistency verified",
      title: "Same photo. Same scores.",
      body: comparison.summary,
      badge: "Exact match",
      accent: true,
    };
  }
  if (comparison.status === "change_detected") {
    return {
      eyebrow: "Progress detected",
      title:
        comparison.direction === "improved"
          ? "A visible change cleared our threshold."
          : "A reliable visual change was found.",
      body: comparison.summary,
      badge: "Verified change",
      accent: true,
    };
  }
  return {
    eyebrow: "Consistency protected",
    title: "No reliable change yet.",
    body: comparison.summary,
    badge: "Scores held",
    accent: false,
  };
}

export function BodyScanReport({
  photo,
  result,
  createdAt,
  demo = false,
  onBack,
  onReset,
  onHistory,
}: BodyScanReportProps) {
  const [shareBusy, setShareBusy] = useState<"share" | "save" | null>(null);
  const metrics: ReportMetric[] = [
    {
      label: "Muscle Development",
      shortLabel: "Muscle",
      score: result.muscleDevelopment.score,
      insight: result.muscleDevelopment.insight,
    },
    {
      label: "V-Taper",
      shortLabel: "V-Taper",
      score: result.vTaper.score,
      insight: result.vTaper.insight,
    },
    {
      label: "Symmetry",
      shortLabel: "Symmetry",
      score: result.symmetry.score,
      insight: result.symmetry.insight,
    },
    {
      label: "Potential",
      shortLabel: "Potential",
      score: result.potential.score,
      insight: result.potential.insight,
      featured: true,
    },
    {
      label: "Shoulder Development",
      shortLabel: "Shoulders",
      score: result.muscleGroups.upperBody.shoulders.score,
      insight: result.muscleGroups.upperBody.shoulders.insight,
    },
    {
      label: "Core Definition",
      shortLabel: "Core",
      score: result.muscleGroups.core.core.score,
      insight: result.muscleGroups.core.core.insight,
    },
  ];
  const confidencePercent = Math.round(result.confidence * 100);
  const comparison = result.comparison;
  const comparisonText = comparisonCopy(comparison);
  const overallDelta = comparison?.scoreDeltas?.overallScore;
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Today";

  async function prepareShare(mode: "share" | "save") {
    if (shareBusy) return;
    setShareBusy(mode);
    try {
      const blob = await createBodyScanShareImage(photo, result, createdAt);
      const filename = `ascendr-body-scan-${new Date(createdAt ?? Date.now())
        .toISOString()
        .slice(0, 10)}.png`;

      if (mode === "share") {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "My Ascendr Body Scan",
            text: `My Ascendr physique score is ${result.overallScore}/100.`,
            files: [file],
          });
          return;
        }
      }

      downloadBlob(blob, filename);
      toast.success(mode === "share" ? "Share card saved — post it anywhere" : "Result saved");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Could not prepare Body Scan share card:", error);
      toast.error("Couldn't prepare your share card. Try again.");
    } finally {
      setShareBusy(null);
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-dvh overflow-x-hidden bg-[#070907] text-white"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)" }}
    >
      <section
        role="region"
        aria-label="Body scan result card"
        className="relative min-h-[860px] overflow-hidden sm:min-h-[900px]"
      >
        <img
          src={photo}
          alt={demo ? "Sample Body Scan" : "Your Body Scan"}
          className="absolute inset-0 h-full w-full object-cover object-top opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-[#070907]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,transparent_0%,rgba(0,0,0,0.08)_28%,rgba(0,0,0,0.86)_86%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#070907] via-[#070907]/88 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/35 to-transparent" />

        <header
          className="relative z-10 mx-auto flex max-w-md items-center justify-between px-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
        >
          <button
            type="button"
            onClick={onBack}
            className="grid h-[44px] w-[44px] place-items-center rounded-full border border-white/10 bg-black/55 backdrop-blur-xl transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-neon/25 bg-black/55 px-3 py-2 backdrop-blur-xl">
            <span className="size-1.5 rounded-full bg-neon shadow-[0_0_12px_var(--neon)]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neon">
              Ascendr Vision
            </span>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[790px] max-w-md flex-col justify-end px-4 pb-5 sm:px-5">
          <div className="mb-3 flex items-end justify-between px-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-neon">
                {demo ? "Sample Body Scan Report" : "Body Scan Report"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-white/55">
                <Clock3 className="size-3" /> {formattedDate}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-neon/20 bg-black/45 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-neon backdrop-blur-xl">
              {demo ? <Sparkles className="size-3" /> : <LockKeyhole className="size-3" />}
              {demo ? "Sample report" : "Private"}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-black/72 p-4 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-5">
            <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-neon/[0.09] blur-3xl" />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/45">
                  Overall physique
                </p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-[76px] font-black leading-[0.82] tracking-[-0.075em]">
                    {result.overallScore}
                  </span>
                  <span className="pb-1 text-sm font-black text-neon">/100</span>
                </div>
              </div>
              <div className="mb-0.5 flex flex-col items-end gap-2">
                {typeof overallDelta === "number" && comparison?.status === "change_detected" && (
                  <span className="flex items-center gap-1 rounded-full bg-neon px-2.5 py-1 text-[10px] font-black text-black">
                    <TrendingUp className="size-3" /> {overallDelta > 0 ? "+" : ""}
                    {overallDelta}
                  </span>
                )}
                <div className="rounded-2xl border border-neon/25 bg-neon/[0.10] px-3 py-2 text-right">
                  <p className="text-xl font-black leading-none text-neon">
                    {result.bodyFatEstimate.lowPercent}–{result.bodyFatEstimate.highPercent}%
                  </p>
                  <p className="mt-1 text-[7px] font-black uppercase tracking-[0.15em] text-white/40">
                    Body fat range
                  </p>
                </div>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {metrics.map((metric, index) => (
                <SnapshotMetric key={metric.label} metric={metric} delay={index * 0.05} />
              ))}
            </div>

            <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-neon">
                  Your next move
                </p>
                <p className="mt-1 truncate text-xs font-bold">{result.actionPlan[0]?.title}</p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-neon text-[10px] font-black text-black">
                01
              </span>
            </div>

            <div className="relative mt-4 grid grid-cols-[0.82fr_1.18fr] gap-2.5">
              <button
                type="button"
                onClick={() => void prepareShare("save")}
                disabled={Boolean(shareBusy)}
                className="flex h-12 min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] text-xs font-bold text-white/75 transition active:scale-[0.98] disabled:opacity-50"
              >
                {shareBusy === "save" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={() => void prepareShare("share")}
                disabled={Boolean(shareBusy)}
                className="flex h-12 min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-neon text-sm font-black text-neon-foreground shadow-[0_12px_34px_-14px_var(--neon)] transition active:scale-[0.98] disabled:opacity-50"
              >
                {shareBusy === "share" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                Share Results
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-md space-y-4 px-4 sm:px-5">
        <MuscleGroupBreakdown muscleGroups={result.muscleGroups} />

        <ComparisonCard result={result} />

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-neon">
              <Target className="size-4" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
                Your physique readout
              </h2>
            </div>
            <span className="text-[9px] font-black text-white/35">
              {confidencePercent}% clarity
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/72">{result.overallSummary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold text-white/55">
              {confidenceLabel(result.confidence)}
            </span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold text-white/55">
              Photo-dependent analysis
            </span>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 text-neon">
            <Sparkles className="size-4" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
              Your strongest signals
            </h2>
          </div>
          <div className="mt-4 grid gap-2.5">
            {result.strongestAreas.map((area) => (
              <div
                key={area}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/20 p-3.5 text-sm text-white/78"
              >
                <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-neon/15 text-neon">
                  <Check className="size-3.5" />
                </div>
                <span className="leading-relaxed">{area}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[28px] border border-neon/20 bg-neon/[0.055] p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-neon/10 blur-3xl" />
          <div className="relative flex items-center gap-2 text-neon">
            <WandSparkles className="size-4" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">
              Highest-impact plan
            </h2>
          </div>
          <div className="relative mt-5 space-y-5">
            {result.actionPlan.map((action, index) => (
              <div key={`${action.title}-${index}`} className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon font-black text-neon-foreground">
                  {String(index + 1).padStart(2, "0")}
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
          <p className="text-[10px] leading-relaxed text-white/42">
            This is a subjective visual fitness opinion from one photo—not a medical or
            body-composition measurement. Pose, pump, clothing, lighting, and camera angle can
            affect visible presentation.
          </p>
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-bold text-black transition active:scale-[0.985]"
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

function SnapshotMetric({ metric, delay }: { metric: ReportMetric; delay: number }) {
  const score = metric.score;

  return (
    <div className="min-w-0">
      <div className="flex items-end justify-between gap-2">
        <p className="truncate text-[8px] font-black uppercase tracking-[0.16em] text-white/45">
          {metric.shortLabel}
        </p>
        <p className="text-xl font-black leading-none text-neon">{score ?? "—"}</p>
      </div>
      <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score ?? 0}%` }}
          transition={{ duration: 0.75, delay }}
          className="h-full rounded-full bg-neon shadow-[0_0_12px_var(--neon)]"
        />
      </div>
    </div>
  );
}

function ComparisonCard({ result }: { result: BodyScanAiResult }) {
  const comparison = result.comparison;
  const copy = comparisonCopy(comparison);
  const deltaItems = comparison?.scoreDeltas
    ? [
        { label: "Overall", value: comparison.scoreDeltas.overallScore },
        { label: "Muscle", value: comparison.scoreDeltas.muscleDevelopment },
        { label: "V-Taper", value: comparison.scoreDeltas.vTaper },
        { label: "Symmetry", value: comparison.scoreDeltas.symmetry },
      ]
    : [];

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 ${
        copy.accent ? "border-neon/20 bg-neon/[0.055]" : "border-white/[0.08] bg-white/[0.035]"
      }`}
    >
      {copy.accent && (
        <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-neon/10 blur-3xl" />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-neon">
          <GitCompareArrows className="size-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{copy.eyebrow}</p>
        </div>
        <span className="rounded-full border border-white/[0.06] bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white/45">
          {copy.badge}
        </span>
      </div>
      <h2 className="relative mt-4 text-xl font-bold tracking-[-0.025em]">{copy.title}</h2>
      <p className="relative mt-2 text-[11px] leading-relaxed text-white/52">{copy.body}</p>

      {comparison?.status === "change_detected" && deltaItems.length > 0 && (
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          {deltaItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.06] bg-black/20 px-2 py-3 text-center"
            >
              <p className="text-base font-black text-neon">
                {item.value > 0 ? "+" : ""}
                {item.value}
              </p>
              <p className="mt-1 text-[7px] font-bold uppercase tracking-wider text-white/35">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function createBodyScanShareImage(
  photo: string,
  result: BodyScanAiResult,
  createdAt?: string | null,
) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const image = await loadCanvasImage(photo);
  drawCover(context, image, width, height);

  const vertical = context.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, "rgba(4, 7, 5, 0.12)");
  vertical.addColorStop(0.34, "rgba(4, 7, 5, 0.2)");
  vertical.addColorStop(0.61, "rgba(4, 7, 5, 0.78)");
  vertical.addColorStop(1, "rgba(4, 7, 5, 0.99)");
  context.fillStyle = vertical;
  context.fillRect(0, 0, width, height);

  const side = context.createLinearGradient(0, 0, width, 0);
  side.addColorStop(0, "rgba(0, 0, 0, 0.72)");
  side.addColorStop(0.68, "rgba(0, 0, 0, 0.08)");
  side.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  context.fillStyle = side;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#a6ff40";
  roundedRect(context, 70, 68, 260, 58, 29);
  context.fill();
  context.fillStyle = "#071006";
  context.font = "900 24px Arial, sans-serif";
  context.letterSpacing = "4px";
  context.fillText("ASCENDR VISION", 94, 106);

  context.fillStyle = "rgba(255,255,255,0.66)";
  context.font = "800 21px Arial, sans-serif";
  context.letterSpacing = "5px";
  context.fillText("BODY SCAN REPORT", 70, 580);

  context.fillStyle = "#ffffff";
  context.font = "900 174px Arial, sans-serif";
  context.letterSpacing = "-10px";
  context.fillText(String(result.overallScore), 60, 755);
  context.fillStyle = "#a6ff40";
  context.font = "900 32px Arial, sans-serif";
  context.letterSpacing = "0px";
  context.fillText("/ 100", 282, 749);

  context.fillStyle = "rgba(255,255,255,0.46)";
  context.font = "700 20px Arial, sans-serif";
  const date = new Date(createdAt ?? Date.now()).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  context.fillText(date, 72, 804);

  context.fillStyle = "rgba(8, 12, 9, 0.86)";
  roundedRect(context, 754, 647, 260, 122, 30);
  context.fill();
  context.strokeStyle = "rgba(166,255,64,0.32)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#a6ff40";
  context.font = "900 42px Arial, sans-serif";
  context.textAlign = "center";
  context.fillText(
    `${result.bodyFatEstimate.lowPercent}–${result.bodyFatEstimate.highPercent}%`,
    884,
    705,
  );
  context.fillStyle = "rgba(255,255,255,0.45)";
  context.font = "800 15px Arial, sans-serif";
  context.letterSpacing = "2px";
  context.fillText("BODY FAT RANGE", 884, 738);
  context.textAlign = "left";

  const metrics = [
    ["MUSCLE", result.muscleDevelopment.score],
    ["V-TAPER", result.vTaper.score],
    ["SYMMETRY", result.symmetry.score],
    ["POTENTIAL", result.potential.score],
    ["SHOULDERS", result.muscleGroups.upperBody.shoulders.score],
    ["CORE", result.muscleGroups.core.core.score],
  ] as const;
  metrics.forEach(([label, score], index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 70 + column * 324;
    const y = 870 + row * 146;
    context.fillStyle = "rgba(255,255,255,0.44)";
    context.font = "800 17px Arial, sans-serif";
    context.letterSpacing = "3px";
    context.fillText(label, x, y);
    context.fillStyle = "#a6ff40";
    context.font = "900 50px Arial, sans-serif";
    context.letterSpacing = "0px";
    context.fillText(score === null ? "—" : String(score), x, y + 58);
    context.fillStyle = "rgba(255,255,255,0.14)";
    roundedRect(context, x + 92, y + 33, 184, 8, 4);
    context.fill();
    context.fillStyle = "#a6ff40";
    if (score !== null) {
      roundedRect(context, x + 92, y + 33, Math.max(8, 184 * (score / 100)), 8, 4);
      context.fill();
    }
  });

  context.fillStyle = "rgba(166,255,64,0.10)";
  roundedRect(context, 70, 1160, 940, 106, 28);
  context.fill();
  context.strokeStyle = "rgba(166,255,64,0.22)";
  context.stroke();
  context.fillStyle = "#a6ff40";
  context.font = "900 15px Arial, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("MY NEXT MOVE", 100, 1204);
  context.fillStyle = "#ffffff";
  context.font = "800 27px Arial, sans-serif";
  context.letterSpacing = "0px";
  context.fillText(
    truncateCanvasText(context, result.actionPlan[0]?.title ?? "Keep building", 810),
    100,
    1243,
  );

  context.fillStyle = "rgba(255,255,255,0.34)";
  context.font = "600 16px Arial, sans-serif";
  context.fillText("Visual fitness feedback • Private until you share", 70, 1318);
  context.fillStyle = "#a6ff40";
  context.textAlign = "right";
  context.font = "900 19px Arial, sans-serif";
  context.fillText("ASCENDR", 1010, 1318);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))),
      "image/png",
      0.94,
    );
  });
}

async function loadCanvasImage(source: string) {
  let objectUrl: string | null = null;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error("Could not load scan photo");
    objectUrl = URL.createObjectURL(await response.blob());
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode scan photo"));
      image.src = objectUrl!;
    });
  } finally {
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 1_000);
  }
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function truncateCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let next = value;
  while (next.length > 1 && context.measureText(`${next}…`).width > maxWidth)
    next = next.slice(0, -1);
  return `${next.trim()}…`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
