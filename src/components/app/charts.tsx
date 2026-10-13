import { motion } from "framer-motion";
import { useId } from "react";
import { SCORE_TIERS, scoreColor, scoreTier } from "@/components/app/kit";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Radar                                                                */
/* ------------------------------------------------------------------ */

export type RadarAxis = {
  label: string;
  value: number | null;
  /** Optional second shape, e.g. potential or the previous scan. */
  compare?: number | null;
};

export function RadarChart({
  axes,
  size = 300,
  color = "var(--color-neon)",
  compareColor = "oklch(1 0 0 / 55%)",
  className,
}: {
  axes: RadarAxis[];
  size?: number;
  color?: string;
  compareColor?: string;
  className?: string;
}) {
  const center = size / 2;
  const radius = size / 2 - 50;
  const count = axes.length;
  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const distance = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as const;
  };
  const polygon = (values: number[]) =>
    values.map((value, index) => point(index, value).join(",")).join(" ");
  const values = axes.map((axis) => axis.value ?? 0);
  const compareValues = axes.some((axis) => axis.compare != null)
    ? axes.map((axis) => axis.compare ?? axis.value ?? 0)
    : null;
  const gradientId = `radar-${useId().replace(/:/g, "")}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={cn("h-auto w-full", className)} role="img">
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0.38" />
        </radialGradient>
      </defs>
      {[25, 50, 75, 100].map((ring) => (
        <polygon
          key={ring}
          points={polygon(axes.map(() => ring))}
          fill={ring === 100 ? "oklch(1 0 0 / 2.5%)" : "none"}
          stroke="oklch(1 0 0 / 9%)"
          strokeWidth="1"
        />
      ))}
      {axes.map((axis, index) => {
        const [x, y] = point(index, 100);
        return (
          <line
            key={axis.label}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="oklch(1 0 0 / 8%)"
            strokeWidth="1"
          />
        );
      })}
      {compareValues && (
        <motion.polygon
          points={polygon(compareValues)}
          fill="none"
          stroke={compareColor}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
      )}
      <motion.g
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      >
        <polygon
          points={polygon(values)}
          fill={`url(#${gradientId})`}
          stroke={color}
          strokeWidth="2.25"
          strokeLinejoin="round"
        />
        {values.map((value, index) => {
          const [x, y] = point(index, value);
          return (
            <circle
              key={axes[index].label}
              cx={x}
              cy={y}
              r="4"
              fill="oklch(0.115 0.004 286)"
              stroke={color}
              strokeWidth="2"
            />
          );
        })}
      </motion.g>
      {axes.map((axis, index) => {
        const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
        const x = center + Math.cos(angle) * (radius + 28);
        const y = center + Math.sin(angle) * (radius + 26);
        const anchor =
          Math.abs(Math.cos(angle)) < 0.3 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        const nudge = Math.abs(Math.cos(angle)) < 0.3 ? 0 : Math.cos(angle) > 0 ? -12 : 12;
        return (
          <g key={axis.label}>
            <text
              x={x + nudge}
              y={y - 5}
              textAnchor={anchor}
              className="fill-[oklch(0.7_0.008_286)] text-[11px] font-semibold"
            >
              {axis.label}
            </text>
            <text
              x={x + nudge}
              y={y + 12}
              textAnchor={anchor}
              className="text-[15px] font-bold"
              style={{ fill: scoreColor(axis.value) }}
            >
              {axis.value ?? "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Gauge                                                                */
/* ------------------------------------------------------------------ */

const GAUGE_START = 150;
const GAUGE_SWEEP = 240;
const GAUGE_TICKS = 48;

function polar(cx: number, cy: number, r: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)] as const;
}

/** Score color along the sweep, so the dial reads red → amber → green. */
function sweepColor(fraction: number) {
  return scoreColor(fraction * 100);
}

/** An altimeter-style dial: tick marks light up to the score, with the level in the middle. */
export function ScoreGauge({
  score,
  label = "Overall",
  size = 240,
  className,
}: {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 8;
  const clamped = Math.max(0, Math.min(100, score));
  const lit = Math.round((clamped / 100) * GAUGE_TICKS);
  const tier = scoreTier(clamped);

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: size, height: size * 0.82 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        {Array.from({ length: GAUGE_TICKS + 1 }, (_, index) => {
          const fraction = index / GAUGE_TICKS;
          const angle = GAUGE_START + GAUGE_SWEEP * fraction;
          const major = index % 6 === 0;
          const [x1, y1] = polar(cx, cy, outer - (major ? 18 : 13), angle);
          const [x2, y2] = polar(cx, cy, outer, angle);
          const on = index <= lit;
          return (
            <motion.line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth={major ? 3.5 : 2.5}
              strokeLinecap="round"
              initial={{ stroke: "oklch(1 0 0 / 9%)" }}
              animate={{ stroke: on ? sweepColor(fraction) : "oklch(1 0 0 / 9%)" }}
              transition={{ duration: 0.2, delay: on ? 0.2 + index * 0.02 : 0 }}
            />
          );
        })}
        {(() => {
          const [mx, my] = polar(cx, cy, outer - 28, GAUGE_START + (GAUGE_SWEEP * clamped) / 100);
          return (
            <motion.circle
              cx={mx}
              cy={my}
              r="5"
              fill={scoreColor(clamped)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            />
          );
        })()}
      </svg>
      <div className="absolute inset-x-0 top-[25%] flex flex-col items-center">
        <p className="kicker">{label}</p>
        <p className="mt-1 flex items-baseline gap-1 tabular-nums">
          <span
            className="text-[64px] font-bold leading-none tracking-[-0.05em]"
            style={{ color: scoreColor(clamped) }}
          >
            {Math.round(clamped)}
          </span>
          <span className="text-[16px] font-semibold text-muted-foreground">/100</span>
        </p>
        <span className="font-data mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-hairline bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase">
          <span className="text-neon">Lvl {tier.level}</span> {tier.label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ascent ladder                                                        */
/* ------------------------------------------------------------------ */

const LADDER_HEIGHTS = [100, 82, 62, 40, 16];

/**
 * The five score levels drawn as a stepped mountain, with a flag planted on
 * the member's current level.
 */
export function TierLadder({ score, className }: { score: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const tiers = [...SCORE_TIERS].reverse();
  const current = scoreTier(score);
  const currentIndex = tiers.findIndex((tier) => tier.label === current.label);
  const width = 320;
  const ground = 122;
  const step = width / tiers.length;
  const ramp = 18;
  const point = (index: number) => ({
    start: index * step,
    top: LADDER_HEIGHTS[index],
    plateauStart: index * step + ramp,
    end: (index + 1) * step,
  });
  let ridge = `M0 ${ground}`;
  tiers.forEach((_, index) => {
    const p = point(index);
    ridge += ` L${p.plateauStart} ${p.top} L${p.end} ${p.top}`;
  });
  const area = `${ridge} L${width} ${ground} Z`;
  const flag = point(currentIndex);
  const flagX = (flag.plateauStart + flag.end) / 2;

  return (
    <div className={className}>
      <svg viewBox={`0 -8 ${width} ${ground + 10}`} className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={`mountain-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-neon)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--color-neon)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#mountain-${id})`} />
        {tiers.map((tier, index) => {
          const p = point(index);
          const previousTop = index === 0 ? ground : point(index - 1).top;
          const reached = index <= currentIndex;
          return (
            <motion.path
              key={tier.label}
              d={`M${p.start} ${previousTop} L${p.plateauStart} ${p.top} L${p.end} ${p.top}`}
              fill="none"
              stroke={reached ? scoreColor(Math.max(tier.min, 1)) : "oklch(1 0 0 / 18%)"}
              strokeWidth={index === currentIndex ? 3.5 : 2.5}
              strokeDasharray={reached ? undefined : "4 5"}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, delay: index * 0.2 }}
            />
          );
        })}
        <motion.g
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + currentIndex * 0.2 }}
        >
          <line
            x1={flagX}
            x2={flagX}
            y1={flag.top}
            y2={flag.top - 28}
            stroke="white"
            strokeWidth="2"
          />
          <path d={`M${flagX} ${flag.top - 28} l16 5 l-16 5 Z`} fill="var(--color-neon)" />
          <circle cx={flagX} cy={flag.top} r="3.5" fill="white" />
        </motion.g>
      </svg>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {tiers.map((tier) => {
          const active = tier.label === current.label;
          return (
            <p
              key={tier.label}
              className={cn(
                "font-data truncate text-center text-[10px] font-semibold uppercase",
                active ? "text-neon" : "text-muted-foreground/70",
              )}
            >
              {tier.label}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Potential                                                            */
/* ------------------------------------------------------------------ */

export function PotentialMeter({
  current,
  potential,
  className,
}: {
  current: number;
  potential: number;
  className?: string;
}) {
  const ceiling = Math.max(current, potential);
  const upside = Math.max(0, Math.round(potential - current));
  return (
    <div className={className}>
      <div className="flex items-end justify-between">
        <div>
          <p className="kicker text-[11px]">Now</p>
          <p
            className="mt-1 text-[28px] font-bold leading-none tabular-nums"
            style={{ color: scoreColor(current) }}
          >
            {Math.round(current)}
          </p>
        </div>
        {upside > 0 && (
          <span className="mb-1 rounded-full bg-neon/12 px-3 py-1 text-[13px] font-bold text-neon">
            +{upside} upside
          </span>
        )}
        <div className="text-right">
          <p className="kicker text-[11px]">Potential</p>
          <p className="mt-1 text-[28px] font-bold leading-none tabular-nums text-neon">
            {Math.round(ceiling)}
          </p>
        </div>
      </div>
      <div className="relative mt-4 h-3.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ceiling}%` }}
          transition={{ duration: 1, delay: 0.2, ease: EASE }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background:
              "repeating-linear-gradient(-45deg, color-mix(in oklch, var(--color-neon) 45%, transparent) 0 6px, color-mix(in oklch, var(--color-neon) 18%, transparent) 6px 12px)",
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${current}%` }}
          transition={{ duration: 1, ease: EASE }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: scoreColor(current) }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trend                                                                */
/* ------------------------------------------------------------------ */

function smoothPath(points: (readonly [number, number])[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function TrendChart({
  points,
  color = "var(--color-neon)",
  height = 150,
  className,
}: {
  points: { label: string; value: number }[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const width = 320;
  const padX = 16;
  const padTop = 26;
  const padBottom = 26;
  const values = points.map((p) => p.value);
  const min = Math.max(0, Math.floor((Math.min(...values) - 8) / 5) * 5);
  const max = Math.min(100, Math.ceil((Math.max(...values) + 6) / 5) * 5);
  const span = Math.max(1, max - min);
  const coords = points.map((p, index) => {
    const x =
      points.length === 1 ? width / 2 : padX + (index * (width - padX * 2)) / (points.length - 1);
    const y = padTop + (1 - (p.value - min) / span) * (height - padTop - padBottom);
    return [x, y] as const;
  });
  const line = smoothPath(coords);
  const area = line
    ? `${line} L ${coords[coords.length - 1][0]} ${height - padBottom} L ${coords[0][0]} ${height - padBottom} Z`
    : "";
  const last = coords[coords.length - 1];
  const labelIndexes = new Set(
    points.length <= 5
      ? points.map((_, index) => index)
      : [0, Math.floor((points.length - 1) / 2), points.length - 1],
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-auto w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`trend-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = padTop + t * (height - padTop - padBottom);
        return (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="oklch(1 0 0 / 7%)"
            strokeDasharray="3 5"
          />
        );
      })}
      {area && (
        <motion.path
          d={area}
          fill={`url(#trend-${id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
      )}
      {line && (
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.75"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
      )}
      {coords.map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index === coords.length - 1 ? 5.5 : 3.5}
          fill={index === coords.length - 1 ? color : "oklch(0.115 0.004 286)"}
          stroke={color}
          strokeWidth="2"
        />
      ))}
      {last && (
        <g>
          <rect
            x={Math.min(width - 44, Math.max(4, last[0] - 20))}
            y={last[1] - 30}
            width="40"
            height="21"
            rx="10.5"
            fill={color}
          />
          <text
            x={Math.min(width - 24, Math.max(24, last[0]))}
            y={last[1] - 15.5}
            textAnchor="middle"
            className="fill-[oklch(0.14_0_0)] text-[12px] font-bold"
          >
            {points[points.length - 1].value}
          </text>
        </g>
      )}
      {points.map((point, index) =>
        labelIndexes.has(index) ? (
          <text
            key={`${point.label}-${index}`}
            x={coords[index][0]}
            y={height - 6}
            textAnchor={
              points.length === 1
                ? "middle"
                : index === 0
                  ? "start"
                  : index === points.length - 1
                    ? "end"
                    : "middle"
            }
            className="fill-[oklch(0.6_0.008_286)] text-[11px] font-medium"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Body-fat spectrum                                                    */
/* ------------------------------------------------------------------ */

const BODY_FAT_ZONES = {
  male: [
    { label: "Shredded", to: 10 },
    { label: "Lean", to: 15 },
    { label: "Fit", to: 20 },
    { label: "Average", to: 26 },
    { label: "High", to: 40 },
  ],
  female: [
    { label: "Shredded", to: 17 },
    { label: "Lean", to: 22 },
    { label: "Fit", to: 27 },
    { label: "Average", to: 33 },
    { label: "High", to: 45 },
  ],
} as const;

export function BodyFatSpectrum({
  low,
  high,
  sex = "male",
  className,
}: {
  low: number;
  high: number;
  sex?: "male" | "female";
  className?: string;
}) {
  const zones = BODY_FAT_ZONES[sex];
  const minScale = sex === "female" ? 10 : 4;
  const maxScale = zones[zones.length - 1].to;
  const position = (value: number) =>
    ((Math.max(minScale, Math.min(maxScale, value)) - minScale) / (maxScale - minScale)) * 100;
  const midpoint = (low + high) / 2;
  const zone = zones.find((item) => midpoint <= item.to) ?? zones[zones.length - 1];
  const left = position(low);
  const right = position(high);

  return (
    <div className={className}>
      <div className="flex items-end justify-between">
        <p className="text-[34px] font-bold leading-none tabular-nums tracking-[-0.03em]">
          {low}–{high}
          <span className="text-[18px] text-muted-foreground">%</span>
        </p>
        <span className="mb-1 rounded-full bg-white/[0.06] px-3 py-1 text-[13px] font-semibold">
          {zone.label}
        </span>
      </div>
      <div className="relative mt-5">
        <div
          className="h-3 rounded-full opacity-90"
          style={{
            background:
              "linear-gradient(90deg, var(--color-score-high), var(--color-score-high) 22%, var(--color-score-mid) 55%, var(--color-score-low))",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
          className="absolute -top-1.5 h-6 rounded-full border-[3px] border-white bg-white/25 shadow-[0_0_18px_oklch(1_0_0/45%)]"
          style={{ left: `${left}%`, width: `${Math.max(3, right - left)}%` }}
        />
      </div>
      <div className="relative mt-3 h-4">
        {zones.map((item, index) => {
          const start = index === 0 ? minScale : zones[index - 1].to;
          const center = position((start + item.to) / 2);
          return (
            <span
              key={item.label}
              className="absolute -translate-x-1/2 text-[11px] font-medium text-muted-foreground"
              style={{ left: `${center}%` }}
            >
              {item.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
