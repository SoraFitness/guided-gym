import { Gem, Mountain } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { HarmonyButton } from "@/components/harmony/HarmonyButton";
import { ScanComparisonCard } from "@/components/scans/ScanComparisonCard";
import { cardClass, ScoreGrid, scoreTier } from "@/components/app/kit";
import {
  PotentialMeter,
  RadarChart,
  ScoreGauge,
  TierLadder,
  TrendChart,
} from "@/components/app/charts";
import { FaceFeatureMap } from "./FaceFeatureMap";
import {
  ActionPlan,
  CoachReadSheet,
  MarketingBanner,
  PhotoScoreHero,
  ReportFooter,
  ReportHeader,
  ReportSection,
  ReportShell,
  SampleBadge,
  ShareActions,
} from "./ReportKit";
import { createScoreShareImage, shareOrDownload } from "./shareCanvas";
import type { WatermarkVariant } from "./shareWatermark";
import type { FaceScanResult } from "@/lib/faceScan.functions";
import { cn } from "@/lib/utils";

// Loaded only when opened, so on-device landmark detection stays out of the report bundle.
const FaceHarmonySheet = lazy(() =>
  import("@/components/harmony/HarmonySheet").then((module) => ({
    default: module.FaceHarmonySheet,
  })),
);

interface FaceScanReportProps {
  photo: string;
  result: FaceScanResult;
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

/** Six headline metrics, shared by the screen and the exported card. */
export function faceBreakdown(result: FaceScanResult) {
  const deltas =
    result.comparison?.status === "change_detected" ? result.comparison.scoreDeltas : undefined;
  return [
    { label: "Symmetry", score: result.facialSymmetry.score, delta: deltas?.facialSymmetry },
    { label: "Jawline", score: result.jawlineDefinition.score, delta: deltas?.jawlineDefinition },
    { label: "Skin", score: result.skinQuality.score, delta: deltas?.skinQuality },
    { label: "Eye area", score: result.eyeArea.score, delta: deltas?.eyeArea },
    { label: "Potential", score: result.looksmaxPotential.score, delta: undefined },
    { label: "Photo clarity", score: Math.round(result.confidence * 100), delta: undefined },
  ];
}

function topFeature(result: FaceScanResult) {
  const features = [
    { label: "Symmetry", score: result.facialSymmetry.score },
    { label: "Jawline", score: result.jawlineDefinition.score },
    { label: "Skin", score: result.skinQuality.score },
    { label: "Eyes", score: result.eyeArea.score },
  ];
  return features.sort((a, b) => b.score - a.score)[0];
}

export function FaceScanReport({
  photo,
  result,
  createdAt,
  demo = false,
  watermark = "standard",
  history,
  onBack,
  onReset,
  onHistory,
}: FaceScanReportProps) {
  const [shareBusy, setShareBusy] = useState<"share" | "save" | null>(null);
  const [harmonyOpen, setHarmonyOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const comparison = result.comparison;
  const overallDelta =
    comparison?.status === "change_detected" ? comparison.scoreDeltas?.overallScore : undefined;
  const tier = scoreTier(result.overallScore);
  const best = topFeature(result);
  const potential = result.looksmaxPotential.score;
  const trend = history && history.length >= 2 ? history : null;

  async function prepareShare(mode: "share" | "save") {
    if (shareBusy) return;
    setShareBusy(mode);
    try {
      const blob = await createFaceScanShareImage(photo, result, createdAt, { watermark });
      const filename = `ascendr-face-scan-${new Date(createdAt ?? Date.now())
        .toISOString()
        .slice(0, 10)}.png`;
      const outcome = await shareOrDownload(blob, filename, mode, {
        title: "My Ascendr Face Scan",
        text: `My Ascendr appearance score is ${result.overallScore}/100.`,
      });
      if (outcome === "downloaded") {
        toast.success(mode === "share" ? "Share card saved — post it anywhere" : "Result saved");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Could not prepare Face Scan share card:", error);
      toast.error("Couldn't prepare your share card. Try again.");
    } finally {
      setShareBusy(null);
    }
  }

  return (
    <ReportShell>
      <ReportHeader title="Face Score" onBack={onBack} onCoachRead={() => setCoachOpen(true)} />

      <PhotoScoreHero
        photo={photo}
        alt={demo ? "Sample Face Scan" : "Your Face Scan"}
        scoreLabel="Overall appearance score"
        score={result.overallScore}
        delta={overallDelta}
        fit="contain"
        badge={watermark !== "marketing" ? <SampleBadge demo={demo} /> : undefined}
        chips={[
          <>
            <Mountain /> Lvl {tier.level} · {tier.label}
          </>,
          <>
            <Gem /> Best: {best.label}
          </>,
        ]}
      />

      {watermark === "marketing" && <MarketingBanner />}

      <ReportSection title="Breakdown">
        <ScoreGrid items={faceBreakdown(result)} />
      </ReportSection>

      <div className="mt-4">
        <ShareActions
          busy={shareBusy}
          onShare={() => void prepareShare("share")}
          onSave={() => void prepareShare("save")}
        />
      </div>

      <ReportSection title="Feature map">
        <div className={cn(cardClass, "px-2 py-4")}>
          <FaceFeatureMap
            symmetry={{ label: "Symmetry", score: result.facialSymmetry.score }}
            eyes={{ label: "Eyes", score: result.eyeArea.score }}
            skin={{ label: "Skin", score: result.skinQuality.score }}
            jawline={{ label: "Jawline", score: result.jawlineDefinition.score }}
          />
        </div>
      </ReportSection>

      <ReportSection
        title="Now vs. potential"
        meta={
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-neon" /> Now
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0 w-3 border-t border-dashed border-white/60" /> Potential
            </span>
          </span>
        }
      >
        <div className={cn(cardClass, "px-2 py-4")}>
          <RadarChart
            className="mx-auto max-w-[330px]"
            axes={[
              { label: "Symmetry", value: result.facialSymmetry.score, compare: potential },
              { label: "Jawline", value: result.jawlineDefinition.score, compare: potential },
              { label: "Skin", value: result.skinQuality.score, compare: potential },
              { label: "Eyes", value: result.eyeArea.score, compare: potential },
              { label: "Overall", value: result.overallScore, compare: potential },
            ]}
          />
          <div className="px-3 pb-1 pt-2">
            <PotentialMeter current={result.overallScore} potential={potential} />
          </div>
        </div>
      </ReportSection>

      <ReportSection title="Where you stand">
        <div className={cn(cardClass, "p-5")}>
          <ScoreGauge score={result.overallScore} label="Appearance" />
          <TierLadder score={result.overallScore} className="mt-2" />
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
          scanLabel="Face"
          comparison={comparison}
          deltas={[
            { label: "Overall", value: comparison?.scoreDeltas?.overallScore },
            { label: "Jawline", value: comparison?.scoreDeltas?.jawlineDefinition },
            { label: "Skin", value: comparison?.scoreDeltas?.skinQuality },
            { label: "Eye Area", value: comparison?.scoreDeltas?.eyeArea },
          ]}
        />
      </div>

      <ReportSection title="Your plan">
        <ActionPlan actions={result.actionPlan} />
      </ReportSection>

      <div className="mt-4">
        <HarmonyButton kind="face" onOpen={() => setHarmonyOpen(true)} />
      </div>

      <ReportFooter
        disclaimer="A subjective AI opinion from one photo, not an objective attractiveness score or a medical assessment. Lighting, lens, angle and grooming change the result."
        resetLabel="New Face Scan"
        onReset={onReset}
        onHistory={onHistory}
      />

      <CoachReadSheet
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
        summary={result.overallSummary}
        highlightsTitle="Strongest features"
        highlights={result.strongestFeatures}
        confidence={result.confidence}
      />

      {harmonyOpen && (
        <Suspense fallback={null}>
          <FaceHarmonySheet photo={photo} onClose={() => setHarmonyOpen(false)} />
        </Suspense>
      )}
    </ReportShell>
  );
}

export async function createFaceScanShareImage(
  photo: string,
  result: FaceScanResult,
  createdAt?: string | null,
  options: { watermark?: WatermarkVariant } = {},
) {
  return createScoreShareImage({
    photo,
    title: "My Face Score",
    scoreLabel: "Overall appearance score",
    score: result.overallScore,
    chips: [
      `Lvl ${scoreTier(result.overallScore).level} · ${scoreTier(result.overallScore).label}`,
      `Best: ${topFeature(result).label}`,
    ],
    metrics: faceBreakdown(result),
    createdAt,
    photoFit: "contain",
    watermark: options.watermark,
    disclaimer: "AI appearance feedback • Private until you share",
    marketingHeadline: "Rate your face with",
    marketingDisclaimer: "AI visual feedback • Scanned with the Ascendr app",
  });
}
