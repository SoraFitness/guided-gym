import { motion } from "framer-motion";

export function BodyScoreBar({
  label,
  value,
  delay = 0,
}: {
  label: string;
  value: number;
  delay?: number;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span className="text-lg font-bold tabular-nums text-neon">{v}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.9, delay, ease: "easeOut" }}
          className="h-full rounded-full bg-neon"
          style={{ boxShadow: "0 0 12px oklch(0.92 0.21 130 / 0.55)" }}
        />
      </div>
    </div>
  );
}
