import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { BodyScanAnalyzer } from "@/components/bodyscan/BodyScanAnalyzer";
import { BodyScoreCard } from "@/components/bodyscan/BodyScoreCard";
import { BodyScoreBar } from "@/components/bodyscan/BodyScoreBar";
import { analyzeBodyScan } from "@/lib/bodyScan.functions";
import {
  SCAN_DISCLAIMER,
  SCORE_LABELS,
  suggestedTargetsFor,
  type BodyScanResult,
  type BodyScanScores,
} from "@/lib/bodyScan";
import { makeThumbnail, saveScan } from "@/lib/bodyScanStore";
import { setNutritionGoals } from "@/lib/nutritionStore";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/_app/scan/body/new")({
  head: () => ({ meta: [{ title: "New Body Scan — Pulse" }] }),
  component: NewBodyScan,
});

type Step = "guide" | "upload" | "analyzing" | "results";

function NewBodyScan() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const analyze = useServerFn(analyzeBodyScan);

  const [step, setStep] = useState<Step>("guide");
  const [front, setFront] = useState<string | null>(null);
  const [side, setSide] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [result, setResult] = useState<BodyScanResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!profile) return null;

  const startAnalysis = async () => {
    if (!front) return;
    setErr(null);
    setStep("analyzing");
    try {
      const data = await analyze({
        data: {
          front,
          side: side ?? undefined,
          back: back ?? undefined,
          profile,
        },
      });
      const thumb = await makeThumbnail(front);
      setResult({ ...data, thumbnail: thumb });
      setStep("results");
    } catch (e) {
      console.error(e);
      setErr("Something went wrong analyzing your scan.");
      setStep("upload");
    }
  };

  return (
    <div className="pb-10 min-h-dvh">
      <header className="px-5 pt-5 flex items-center gap-3">
        <button
          onClick={() => {
            if (step === "results") {
              navigate({ to: "/scan/body" });
            } else if (step === "upload") {
              setStep("guide");
            } else if (step === "guide") {
              navigate({ to: "/scan/body" });
            }
          }}
          disabled={step === "analyzing"}
          className="size-10 rounded-full bg-surface grid place-items-center disabled:opacity-40"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <p className="text-xs uppercase tracking-[0.22em] text-neon font-bold">
          {step === "results" ? "Your Scan" : "Body Scan"}
        </p>
      </header>

      <AnimatePresence mode="wait">
        {step === "guide" && (
          <motion.div
            key="guide"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-5 pt-6"
          >
            <h1 className="text-3xl font-bold">Photo guide</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Better photos = better analysis. Follow these tips.
            </p>

            <ul className="mt-5 space-y-3">
              {[
                "Use good, even lighting",
                "Wear fitted gym clothes",
                "Stand straight, arms slightly out",
                "Keep your full body in frame",
                "Take front, side and back photos",
                "Avoid mirrors that block your body",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 rounded-2xl bg-surface p-4 border border-white/5"
                >
                  <div className="size-7 rounded-full bg-neon/15 grid place-items-center text-neon mt-0.5">
                    <Check className="size-4" />
                  </div>
                  <p className="text-sm">{t}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
              <TriangleAlert className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">
                Upload fitness-appropriate photos only. No nude or explicit imagery.
              </p>
            </div>

            <button
              onClick={() => setStep("upload")}
              className="mt-6 w-full h-14 rounded-2xl bg-neon text-neon-foreground font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Camera className="size-5" /> Continue
            </button>
          </motion.div>
        )}

        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-5 pt-6"
          >
            <h1 className="text-3xl font-bold">Add your photos</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Front is required. Side and back improve accuracy.
            </p>

            <div className="mt-5 space-y-3">
              <PhotoSlot label="Front" required value={front} onChange={setFront} />
              <PhotoSlot label="Side" value={side} onChange={setSide} />
              <PhotoSlot label="Back" value={back} onChange={setBack} />
            </div>

            {err && (
              <p className="mt-4 text-sm text-destructive text-center">{err}</p>
            )}

            <button
              onClick={startAnalysis}
              disabled={!front}
              className="mt-6 w-full h-14 rounded-2xl bg-neon text-neon-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition"
              style={{ boxShadow: "0 14px 40px -10px oklch(0.92 0.21 130 / 0.55)" }}
            >
              <Sparkles className="size-5" /> Analyze My Physique
            </button>
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              {SCAN_DISCLAIMER}
            </p>
          </motion.div>
        )}

        {step === "analyzing" && front && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <BodyScanAnalyzer image={front} />
          </motion.div>
        )}

        {step === "results" && result && (
          <ResultsView
            result={result}
            image={front ?? undefined}
            onRetake={() => {
              setResult(null);
              setFront(null);
              setSide(null);
              setBack(null);
              setStep("upload");
            }}
            onSave={() => {
              saveScan(result);
              navigate({ to: "/scan/body" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultsView({
  result,
  image,
  onRetake,
  onSave,
}: {
  result: BodyScanResult;
  image?: string;
  onRetake: () => void;
  onSave: () => void;
}) {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [applied, setApplied] = useState(false);

  const applyTargets = () => {
    if (!profile) return;
    const t = suggestedTargetsFor(profile);
    if (
      confirm(
        `Apply suggested targets?\n\n${t.kcal} kcal · ${t.protein}g protein · ${t.carbs}g carbs · ${t.fat}g fat`,
      )
    ) {
      setNutritionGoals(t);
      setApplied(true);
    }
  };

  const scoreEntries = Object.entries(result.scores) as [keyof BodyScanScores, number][];

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-4 space-y-5"
    >
      <BodyScoreCard scan={result} image={image} />

      <p className="text-sm text-muted-foreground leading-relaxed text-balance">
        {result.summary}
      </p>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-4">
          Score Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {scoreEntries.map(([k, v], i) => (
            <BodyScoreBar key={k} label={SCORE_LABELS[k]} value={v} delay={i * 0.05} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-3">
          Strengths
        </h3>
        <ul className="space-y-2">
          {result.strengths.map((s) => (
            <li key={s} className="flex gap-3 text-sm">
              <CheckCircle2 className="size-4 text-neon shrink-0 mt-0.5" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-amber-400 font-bold mb-3">
          Areas to improve
        </h3>
        <ul className="space-y-2">
          {result.improvements.map((s) => (
            <li key={s} className="flex gap-3 text-sm">
              <ChevronRight className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-3">
          Training Focus
        </h3>
        <ul className="space-y-2">
          {result.trainingFocus.map((s) => (
            <li key={s} className="text-sm">
              · {s}
            </li>
          ))}
        </ul>
        <button
          onClick={() => navigate({ to: "/workouts" })}
          className="mt-4 w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold flex items-center justify-center gap-2 transition"
        >
          View Workout Plan <ChevronRight className="size-4" />
        </button>
      </section>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-3">
          Nutrition Focus
        </h3>
        <ul className="space-y-2">
          {result.nutritionFocus.map((s) => (
            <li key={s} className="text-sm">
              · {s}
            </li>
          ))}
        </ul>
        <button
          onClick={applyTargets}
          disabled={applied}
          className="mt-4 w-full h-11 rounded-xl bg-neon/15 text-neon text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60"
        >
          {applied ? (
            <>
              <Check className="size-4" /> Targets applied
            </>
          ) : (
            <>Apply suggested nutrition targets</>
          )}
        </button>
      </section>

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        {result.disclaimer}
        {result.source === "mock" && " AI backend unavailable — showing a demo estimate."}
      </p>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onRetake}
          className="h-13 rounded-2xl bg-surface border border-white/10 h-12 font-semibold text-sm"
        >
          Retake
        </button>
        <button
          onClick={onSave}
          className="h-12 rounded-2xl bg-neon text-neon-foreground font-bold text-sm"
        >
          Save Scan
        </button>
      </div>
    </motion.div>
  );
}
