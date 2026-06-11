import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { BodyScanResult } from "@/lib/bodyScan";

export function BodyScoreCard({
  scan,
  image,
}: {
  scan: BodyScanResult;
  image?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-black aspect-[3/4]">
      {image ? (
        <img
          src={image}
          alt="Body scan preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 border border-white/10">
          {scan.level}
        </span>
        {scan.source === "ai" ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/20 text-neon text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="size-3" /> AI
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-[10px] font-bold uppercase tracking-wider">
            Demo
          </span>
        )}
      </div>

      <div className="absolute bottom-5 left-5 right-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-semibold">
          Overall Score
        </p>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[88px] leading-none font-extrabold text-white tabular-nums"
          style={{ letterSpacing: "-0.04em" }}
        >
          {scan.overallScore}
        </motion.p>
      </div>
    </div>
  );
}
