import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = [
  "Detecting body pose…",
  "Measuring proportions…",
  "Analyzing symmetry & posture…",
  "Estimating muscle definition…",
  "Compiling your physique report…",
];

export function BodyScanAnalyzer({ image }: { image: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="px-5 pt-8">
      <div className="relative aspect-[3/4] rounded-[28px] overflow-hidden bg-black border border-white/5">
        <img
          src={image}
          alt="Analyzing"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/30" />

        {/* scan line */}
        <motion.div
          initial={{ y: "-10%" }}
          animate={{ y: "110%" }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
          className="absolute left-0 right-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.92 0.21 130 / 0.35), transparent)",
            boxShadow: "0 0 30px oklch(0.92 0.21 130 / 0.55)",
          }}
        />

        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.92 0.21 130 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.92 0.21 130 / 0.3) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="absolute bottom-5 left-5 right-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold">
            Scanning physique
          </p>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-lg font-semibold mt-1"
          >
            {STEPS[step]}
          </motion.p>
        </div>
      </div>
    </div>
  );
}
