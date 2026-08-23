import { motion } from "framer-motion";
import { Check, Clock3, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface ScanAnalysisProgressProps {
  photo: string;
  scanType: "face" | "body";
  preview?: boolean;
}

const previewSteps = [
  "Preparing your photo",
  "Checking image clarity",
  "Estimating your physique rating",
  "Locking personalized insights",
  "Ready for the next step",
] as const;

const steps = {
  face: [
    "Securing your photo",
    "Checking photo quality",
    "Reviewing visible features",
    "Building your action plan",
    "Finalizing and saving your report",
  ],
  body: [
    "Securing your photo",
    "Checking full-body visibility",
    "Mapping nine muscle groups",
    "Building your action plan",
    "Finalizing and saving your report",
  ],
} as const;

const stageTimings = {
  face: [0, 10, 24, 40, 55],
  body: [0, 12, 28, 48, 68],
} as const;

function formatElapsed(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ScanAnalysisProgress({
  photo,
  scanType,
  preview = false,
}: ScanAnalysisProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const scanSteps = preview ? previewSteps : steps[scanType];
  const timings = preview ? ([0, 1, 2, 3, 4] as const) : stageTimings[scanType];
  const activeStep = timings.reduce<number>(
    (current, threshold, index) => (elapsedSeconds >= threshold ? index : current),
    0,
  );
  const takingLonger = elapsedSeconds >= 45;
  const nearlyTimedOut = elapsedSeconds >= 80;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-dvh overflow-hidden bg-black text-white"
    >
      <img
        src={photo}
        alt="Your uploaded scan"
        className="absolute inset-0 h-full w-full object-cover object-top opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black" />
      <motion.div
        className="absolute inset-x-5 h-px bg-neon shadow-[0_0_24px_4px_var(--neon)]"
        initial={{ top: scanType === "face" ? "18%" : "10%" }}
        animate={{
          top: scanType === "face" ? ["18%", "70%", "18%"] : ["10%", "84%", "10%"],
        }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-end px-4 page-pb-safe sm:px-5">
        <div className="rounded-[30px] border border-white/10 bg-black/70 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-neon/15 text-neon">
                <Loader2 className="size-5 animate-spin" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-neon">
                  Ascendr Vision
                </p>
                <h1 className="mt-0.5 text-lg font-bold">
                  {preview ? "Preparing your preview" : "Building your report"}
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-xs font-bold text-neon">
                <Clock3 className="size-3.5" /> {formatElapsed(elapsedSeconds)}
              </p>
              <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/35">
                {preview ? "No sign-in needed" : "Usually 20–70 sec"}
              </p>
            </div>
          </div>

          <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-neon"
              animate={{ width: `${[14, 32, 52, 72, 90][activeStep]}%` }}
              transition={{ duration: 0.45 }}
            />
          </div>

          <div className="mt-5 space-y-3">
            {scanSteps.map((step, index) => {
              const complete = index < activeStep;
              const active = index === activeStep;
              return (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`grid size-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${
                      complete
                        ? "border-neon bg-neon text-neon-foreground"
                        : active
                          ? "border-neon/50 bg-neon/10 text-neon"
                          : "border-white/10 text-white/25"
                    }`}
                  >
                    {complete ? <Check className="size-3.5" /> : index + 1}
                  </div>
                  <p className={`text-xs ${active ? "font-semibold text-white" : "text-white/45"}`}>
                    {step}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-white/[0.04] p-3">
            {takingLonger ? (
              <Sparkles className="mt-0.5 size-4 shrink-0 text-neon" />
            ) : (
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neon" />
            )}
            <p className="text-[10px] leading-relaxed text-white/45">
              {preview
                ? "This limited AI check creates your photo-specific score. Detailed factor numbers, body-fat insights, and your full report stay locked until you subscribe."
                : nearlyTimedOut
                  ? "Still connected. If the provider times out, your private photo stays saved for a one-tap retry."
                  : takingLonger
                    ? "This high-detail scan is taking longer than usual, but it is still working. Keep this screen open."
                    : "Keep this screen open. Your private photo and completed report are saved to your account."}
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
