import { Droplet, Mountain } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { HarmonyButton } from "@/components/harmony/HarmonyButton";
import { ScanComparisonCard } from "@/components/scans/ScanComparisonCard";
import {
  AnatomyPair,
  regionsForCanonical,
  type AnatomyFills,
} from "@/components/app/AnatomyFigure";
import { cardClass, ScoreGrid, scoreColor, scoreTier } from "@/components/app/kit";
import {
  BodyFatSpectrum,
  PotentialMeter,
  RadarChart,
  TierLadder,
  TrendChart,
} from "@/components/app/charts";
import {
  ActionPlan,
  CoachReadSheet,
  MarketingBanner,
  PhotoScoreHero,
  RankedChips,
  ReportFooter,
  ReportHeader,
  ReportSection,
  ReportShell,
  SampleBadge,
  ShareActions,
} from "./ReportKit";
import { createScoreShareImage, shareOrDownload } from "./shareCanvas";
import type { WatermarkVariant } from "./shareWatermark";
import type { BodyScanAiResult } from "@/lib/bodyScan.functions";
import type { CanonicalMuscle } from "@/lib/muscleAnalytics";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

// Loaded only when opened, so on-device landmark detection stays out of the report bundle.
const BodyHarmonySheet = lazy(() =>
  import("@/components/harmony/HarmonySheet").then((module) => ({
    default: module.BodyHarmonySheet,
  })),
);

interface BodyScanReportProps {
  photo: string;
  result: BodyScanAiResult;
  createdAt?: string | null;
  demo?: boolean;
  /** "marketing" exports the oversized brand band. Members always get "standard". */
  watermark?: WatermarkVariant;
  /** Overall scores of earlier scans, oldest first, ending with this one. */
  history?: { label: string; value: number }[];
  onBack: () => void;
  onReset?: () => void;
  onHistory?: () => void;
}

type MuscleRow = { id: CanonicalMuscle; label: string; score: number | null };

function muscleRows(result: BodyScanAiResult): MuscleRow[] {
  const { upperBody, core, lowerBody } = result.muscleGroups;
  return [
    { id: "shoulders", label: "Shoulders", score: upperBody.shoulders.score },
    { id: "chest", label: "Chest", score: upperBody.chest.score },
    { id: "back", label: "Back", score: upperBody.back.score },
    { id: "arms", label: "Arms", score: upperBody.arms.score },
    { id: "core", label: "Core", score: core.core.score },
    { id: "glutes", label: "Glutes", score: lowerBody.glutes.score },
    { id: "quads", label: "Quads", score: lowerBody.quads.score },
    { id: "hamstrings", label: "Hamstrings", score: lowerBody.hamstrings.score },
    { id: "calves", label: "Calves", score: lowerBody.calves.score },
  ];
}

function average(values: (number | null)[]) {
  const known = values.filter((value): value is number => value != null);
  return known.length
    ? Math.round(known.reduce((sum, value) => sum + value, 0) / known.length)
    : null;
}

/** Six headline metrics, shared by the screen and the exported card. */
export function bodyBreakdown(result: BodyScanAiResult) {
  const deltas =
    result.comparison?.status === "change_detected" ? result.comparison.scoreDeltas : undefined;
  return [
    {
      label: "Muscle",
      score: result.muscleDevelopment.score,
      delta: deltas?.muscleDevelopment,
    },
    { label: "V-Taper", score: result.vTaper.score, delta: deltas?.vTaper },
    { label: "Symmetry", score: result.symmetry.score, delta: deltas?.symmetry },
    result.visibleConditioning === undefined
      ? { label: "Potential", score: result.potential.score, delta: undefined }
      : {
          label: "Conditioning",
          score: result.visibleConditioning,
          delta: deltas?.visibleConditioning,
        },
    {
      label: "Shoulders",
      score: result.muscleGroups.upperBody.shoulders.score,
      delta: undefined,
    },
    { label: "Core", score: result.muscleGroups.core.core.score, delta: undefined },
  ];
}

export function BodyScanReport({
  photo,
  result,
  createdAt,
  demo = false,
  watermark = "standard",
  history,
  onBack,
  onReset,
  onHistory,
}: BodyScanReportProps) {
  const { profile } = useProfile();
  const [shareBusy, setShareBusy] = useState<"share" | "save" | null>(null);
  const [harmonyOpen, setHarmonyOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const comparison = result.comparison;
  const overallDelta =
    comparison?.status === "change_detected" ? comparison.scoreDeltas?.overallScore : undefined;
  const breakdown = bodyBreakdown(result);
  const muscles = useMemo(() => muscleRows(result), [result]);
  const scored = muscles.filter((row): row is MuscleRow & { score: number } => row.score != null);
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const byId = Object.fromEntries(muscles.map((row) => [row.id, row.score])) as Record<
    CanonicalMuscle,
    number | null
  >;
  const radarAxes = [
    { label: "Shoulders", value: byId.shoulders },
    { label: "Chest", value: byId.chest },
    { label: "Arms", value: byId.arms },
    { label: "Legs", value: average([byId.quads, byId.hamstrings, byId.calves, byId.glutes]) },
    { label: "Core", value: byId.core },
    { label: "Back", value: byId.back },
  ];
  // Regions the camera could not assess are left off rather than drawn as zero.
  const visibleRadarAxes = radarAxes.filter((axis) => axis.value != null);
  const heatmap = useMemo<AnatomyFills>(() => {
    const fills: AnatomyFills = {};
    for (const row of muscles) {
      if (row.score == null) continue;
      for (const region of regionsForCanonical(row.id)) fills[region] = scoreColor(row.score);
    }
    return fills;
  }, [muscles]);
  const tier = scoreTier(result.overallScore);
  const sex = profile?.gender === "female" ? "female" : "male";
  const trend = history && history.length >= 2 ? history : null;

  async function prepareShare(mode: "share" | "save") {
    if (shareBusy) return;
    setShareBusy(mode);
    try {
      const blob = await createBodyScanShareImage(photo, result, createdAt, { watermark });
      const filename = `ascendr-body-scan-${new Date(createdAt ?? Date.now())
        .toISOString()
        .slice(0, 10)}.png`;
      const outcome = await shareOrDownload(blob, filename, mode, {
        title: "My Ascendr Body Scan",
        text: `My Ascendr physique score is ${result.overallScore}/100.`,
      });
      if (outcome === "downloaded") {
        toast.success(mode === "share" ? "Share card saved — post it anywhere" : "Result saved");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Could not prepare Body Scan share card:", error);
      toast.error("Couldn't prepare your share card. Try again.");
    } finally {
      setShareBusy(null);
    }
  }

  return (
    <ReportShell>
      <ReportHeader title="Body Score" onBack={onBack} onCoachRead={() => setCoachOpen(true)} />

      <PhotoScoreHero
        photo={photo}
        alt={demo ? "Sample Body Scan" : "Your Body Scan"}
        scoreLabel="Overall physique score"
        score={result.overallScore}
        delta={overallDelta}
        badge={watermark !== "marketing" ? <SampleBadge demo={demo} /> : undefined}
        chips={[
          <>
            <Mountain /> Lvl {tier.level} · {tier.label}
          </>,
          <>
            <Droplet /> {result.bodyFatEstimate.lowPercent}–{result.bodyFatEstimate.highPercent}%
            body fat
          </>,
        ]}
      />

      {watermark === "marketing" && <MarketingBanner />}

      <ReportSection title="Breakdown">
        <ScoreGrid items={breakdown} />
      </ReportSection>

      <div className="mt-4">
        <ShareActions
          busy={shareBusy}
          onShare={() => void prepareShare("share")}
          onSave={() => void prepareShare("save")}
        />
      </div>

      <ReportSection title="Muscle map" meta={`${scored.length}/9 visible`}>
        <div className={cn(cardClass, "p-5")}>
          <AnatomyPair
            fills={heatmap}
            className="mx-auto max-w-[300px]"
            figureClassName="max-h-[240px]"
            label="Muscle development heatmap"
          />
          <div className="mt-4 flex items-center justify-center gap-4 text-[12px] text-muted-foreground">
            {(
              [
                ["Strong", "var(--color-score-high)"],
                ["Average", "var(--color-score-mid)"],
                ["Lagging", "var(--color-score-low)"],
              ] as const
            ).map(([label, color]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        {ranked.length >= 4 && (
          <div className="mt-2.5">
            <RankedChips strongest={ranked.slice(0, 2)} weakest={ranked.slice(-2).reverse()} />
          </div>
        )}
      </ReportSection>

      {visibleRadarAxes.length >= 3 && (
        <ReportSection title="Balance">
          <div className={cn(cardClass, "px-2 py-4")}>
            <RadarChart axes={visibleRadarAxes} className="mx-auto max-w-[330px]" />
          </div>
        </ReportSection>
      )}

      <ReportSection title="Body fat">
        <div className={cn(cardClass, "p-5")}>
          <BodyFatSpectrum
            low={result.bodyFatEstimate.lowPercent}
            high={result.bodyFatEstimate.highPercent}
            sex={sex}
          />
        </div>
      </ReportSection>

      <ReportSection title="Potential">
        <div className={cn(cardClass, "p-5")}>
          <PotentialMeter current={result.overallScore} potential={result.potential.score} />
          <div className="mt-6 border-t border-hairline pt-5">
            <TierLadder score={result.overallScore} />
          </div>
        </div>
      </ReportSection>

      {trend && (
        <ReportSection title="Progress" meta={`${trend.length} scans`}>
          <div className={cn(cardClass, "px-3 pb-3 pt-4")}>
            <TrendChart points={trend} />
          </div>
        </ReportSection>
      )}

      <div className="mt-4">
        <ScanComparisonCard
          scanLabel="Body"
          comparison={comparison}
          deltas={[
            { label: "Overall", value: comparison?.scoreDeltas?.overallScore },
            { label: "Muscle", value: comparison?.scoreDeltas?.muscleDevelopment },
            { label: "V-Taper", value: comparison?.scoreDeltas?.vTaper },
            comparison?.scoreDeltas?.visibleConditioning === undefined
              ? { label: "Symmetry", value: comparison?.scoreDeltas?.symmetry }
              : { label: "Conditioning", value: comparison?.scoreDeltas?.visibleConditioning },
          ]}
        />
      </div>

      <ReportSection title="Your plan">
        <ActionPlan actions={result.actionPlan} />
      </ReportSection>

      <div className="mt-4">
        <HarmonyButton kind="body" onOpen={() => setHarmonyOpen(true)} />
      </div>

      <ReportFooter
        disclaimer="A visual fitness opinion from one photo, not a medical or body-composition measurement. Pose, pump, lighting and angle change how a physique reads."
        resetLabel="New Body Scan"
        onReset={onReset}
        onHistory={onHistory}
      />

      <CoachReadSheet
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        summary={result.overallSummary}
        highlightsTitle="Strongest signals"
        highlights={result.strongestAreas}
        confidence={result.confidence}
      />

      {harmonyOpen && (
        <Suspense fallback={null}>
          <BodyHarmonySheet photo={photo} onClose={() => setHarmonyOpen(false)} />
        </Suspense>
      )}
    </ReportShell>
  );
}

export async function createBodyScanShareImage(
  photo: string,
  result: BodyScanAiResult,
  createdAt?: string | null,
  options: { watermark?: WatermarkVariant } = {},
) {
  return createScoreShareImage({
    photo,
    title: "My Body Score",
    scoreLabel: "Overall physique score",
    score: result.overallScore,
    chips: [
      `Lvl ${scoreTier(result.overallScore).level} · ${scoreTier(result.overallScore).label}`,
      `${result.bodyFatEstimate.lowPercent}–${result.bodyFatEstimate.highPercent}% body fat`,
    ],
    metrics: bodyBreakdown(result),
    createdAt,
    photoFit: "cover",
    watermark: options.watermark,
    disclaimer: "Visual fitness feedback • Private until you share",
    marketingHeadline: "Scan your physique with",
    marketingDisclaimer: "AI visual feedback • Scanned with the Ascendr app",
  });
}
