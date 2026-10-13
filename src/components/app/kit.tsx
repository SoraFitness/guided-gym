import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Score language: one color scale for every score in the app.         */
/* ------------------------------------------------------------------ */

export type ScoreTone = "high" | "mid" | "low";

export function scoreTone(score: number | null | undefined): ScoreTone {
  if (score == null) return "low";
  if (score >= 70) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export const TONE_COLOR: Record<ScoreTone, string> = {
  high: "var(--color-score-high)",
  mid: "var(--color-score-mid)",
  low: "var(--color-score-low)",
};

export function scoreColor(score: number | null | undefined) {
  return score == null ? "oklch(0.45 0.006 286)" : TONE_COLOR[scoreTone(score)];
}

export const MACRO_COLORS = {
  protein: "var(--color-score-high)",
  carbs: "var(--color-score-mid)",
  fat: "var(--color-analytics-violet)",
} as const;

/** Ascendr's score tiers are climbing levels: every scan is a step up the mountain. */
export const SCORE_TIERS = [
  { min: 85, label: "Apex", level: 5 },
  { min: 72, label: "Summit", level: 4 },
  { min: 58, label: "Ascender", level: 3 },
  { min: 42, label: "Climber", level: 2 },
  { min: 0, label: "Base Camp", level: 1 },
] as const;

export function scoreTier(score: number) {
  return SCORE_TIERS.find((tier) => score >= tier.min) ?? SCORE_TIERS[SCORE_TIERS.length - 1];
}

/* ------------------------------------------------------------------ */
/* Class recipes for links and buttons (keeps router typing at call).  */
/* ------------------------------------------------------------------ */

export const iconButtonClass =
  "relative grid size-11 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-foreground transition active:scale-95 [&_svg]:size-[19px]";

export const primaryButtonClass =
  "flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-neon px-5 text-[15px] font-bold text-neon-foreground transition active:scale-[0.985] disabled:opacity-50 [&_svg]:size-[18px]";

export const secondaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-hairline bg-surface px-4 text-[14px] font-semibold text-foreground transition active:scale-[0.985] disabled:opacity-50 [&_svg]:size-4";

export const cardClass = "rounded-[24px] border border-hairline bg-surface";

/* ------------------------------------------------------------------ */
/* Layout                                                               */
/* ------------------------------------------------------------------ */

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("animate-slide-up px-4 pb-8 pt-5 sm:px-5", className)}>{children}</div>;
}

export function PageHeader({
  kicker,
  title,
  actions,
  className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-end justify-between gap-3 px-1", className)}>
      <div className="min-w-0">
        {kicker && <p className="kicker truncate">{kicker}</p>}
        <h1 className="mt-1 truncate text-[28px] font-bold leading-[1.1] tracking-[-0.03em]">
          {title}
        </h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  meta,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3 px-1", className)}>
      <h2 className="truncate text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
      {meta && <div className="shrink-0 text-[13px] font-medium text-muted-foreground">{meta}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={cn(cardClass, "p-4 sm:p-5", className)}>{children}</Tag>;
}

/** The small lime triangle that marks Ascendr headings: always pointing up. */
export function AscentMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 9" aria-hidden className={cn("size-2.5 shrink-0 text-neon", className)}>
      <path d="M5 0 L10 9 H0 Z" fill="currentColor" />
    </svg>
  );
}

export function Kicker({
  children,
  accent = false,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <p className={cn("kicker flex items-center gap-1.5", accent && "text-neon", className)}>
      {accent && <AscentMark className="size-2" />}
      {children}
    </p>
  );
}

/**
 * Signature hero surface: a contour-textured card with its top-right corner cut
 * away and the cut edge lit in lime.
 */
export function HeroCard({
  children,
  className,
  chamfer = 28,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  chamfer?: number;
  as?: "section" | "div";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...rest}
      className={cn(
        "chamfer contour-texture relative rounded-[24px] bg-surface shadow-[inset_0_0_0_1px_var(--hairline)]",
        className,
      )}
      style={{ ...rest.style, ["--chamfer" as string]: `${chamfer}px` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 h-[3px] origin-top-left bg-neon"
        style={{
          left: `calc(100% - ${chamfer}px)`,
          width: chamfer * Math.SQRT2,
          transform: "rotate(45deg) translateY(-1.5px)",
        }}
      />
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                         */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  value,
  size = 84,
  stroke = 8,
  color = "var(--color-neon)",
  track = "oklch(1 0 0 / 8%)",
  children,
  className,
}: {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  // A dial of short radial ticks, Ascendr's take on the progress ring.
  const segments = size >= 80 ? 36 : 28;
  const lit = Math.round(clamped * segments);
  const center = size / 2;
  const outer = size / 2 - 1;
  const inner = outer - stroke - 1;

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden>
        {Array.from({ length: segments }, (_, index) => {
          const angle = (index / segments) * Math.PI * 2 - Math.PI / 2;
          const on = index < lit;
          return (
            <motion.line
              key={index}
              x1={center + Math.cos(angle) * inner}
              y1={center + Math.sin(angle) * inner}
              x2={center + Math.cos(angle) * outer}
              y2={center + Math.sin(angle) * outer}
              strokeWidth={Math.max(2, (Math.PI * 2 * outer) / segments - 3.2)}
              strokeLinecap="round"
              initial={{ stroke: track }}
              animate={{ stroke: on ? color : track }}
              transition={{ duration: 0.25, delay: on ? 0.15 + index * 0.018 : 0 }}
            />
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
      )}
    </div>
  );
}

export function ScoreBar({
  label,
  score,
  delta,
  delay = 0,
  className,
}: {
  label: string;
  score: number | null;
  delta?: number | null;
  delay?: number;
  className?: string;
}) {
  const color = scoreColor(score);
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[14px] font-medium text-foreground/85">{label}</p>
        <p className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          {delta != null && delta !== 0 && (
            <span
              className="text-[12px] font-bold"
              style={{ color: delta > 0 ? "var(--color-score-high)" : "var(--color-score-low)" }}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
          <span className="text-[17px] font-bold" style={{ color }}>
            {score ?? "—"}
          </span>
        </p>
      </div>
      <LevelMeter value={(score ?? 0) / 100} color={color} delay={delay} className="mt-2" />
    </div>
  );
}

/** Ten blocks that fill like levels; the last block fills partially. */
export function LevelMeter({
  value,
  color = "var(--color-neon)",
  blocks = 10,
  delay = 0,
  className,
}: {
  value: number;
  color?: string;
  blocks?: number;
  delay?: number;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(1, value)) * blocks;
  return (
    <div className={cn("flex h-[8px] gap-[3px]", className)} aria-hidden>
      {Array.from({ length: blocks }, (_, index) => {
        const fill = Math.max(0, Math.min(1, filled - index));
        return (
          <span
            key={index}
            className="relative flex-1 overflow-hidden rounded-[3px] bg-white/[0.08]"
          >
            {fill > 0 && (
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${fill * 100}%` }}
                transition={{ duration: 0.18, delay: delay + index * 0.045 }}
                className="absolute inset-y-0 left-0"
                style={{ backgroundColor: color }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function ScoreGrid({
  items,
  className,
}: {
  items: { label: string; score: number | null; delta?: number | null }[];
  className?: string;
}) {
  return (
    <div className={cn(cardClass, "grid grid-cols-2 gap-x-6 gap-y-5 p-5", className)}>
      {items.map((item, index) => (
        <ScoreBar key={item.label} {...item} delay={index * 0.06} />
      ))}
    </div>
  );
}

export function DeltaBadge({ value, className }: { value: number; className?: string }) {
  if (!value) return null;
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums",
        className,
      )}
      style={{
        color: up ? "var(--color-score-high)" : "var(--color-score-low)",
        backgroundColor: `color-mix(in oklch, ${up ? "var(--color-score-high)" : "var(--color-score-low)"} 14%, transparent)`,
      }}
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {up ? "+" : ""}
      {value}
    </span>
  );
}

export function Chip({
  children,
  icon,
  className,
  active = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold [&_svg]:size-3.5 [&_svg]:shrink-0",
        active
          ? "border-neon/30 bg-neon/12 text-neon"
          : "border-white/[0.12] bg-black/35 text-foreground/90 backdrop-blur-md",
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function DifficultyBadge({ level }: { level: string }) {
  const tone =
    level === "Advanced" || level === "Hard"
      ? "var(--color-score-low)"
      : level === "Intermediate" || level === "Medium"
        ? "var(--color-score-mid)"
        : "var(--color-score-high)";
  const label =
    level === "Advanced"
      ? "Hard"
      : level === "Intermediate"
        ? "Medium"
        : level === "Beginner"
          ? "Easy"
          : level;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold"
      style={{ color: tone, backgroundColor: `color-mix(in oklch, ${tone} 16%, transparent)` }}
    >
      {label}
    </span>
  );
}

export function StatTile({
  label,
  value,
  goal,
  unit,
  color = "var(--color-neon)",
  className,
}: {
  label: string;
  value: number;
  goal?: number;
  unit?: string;
  color?: string;
  className?: string;
}) {
  const progress = goal ? Math.min(1, Math.max(0, value / goal)) : 0;
  return (
    <div className={cn(cardClass, "min-w-0 rounded-[20px] p-3.5", className)}>
      <p className="kicker flex items-center gap-1.5 truncate">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-0.5 tabular-nums">
        <span className="text-[22px] font-bold leading-none">{Math.round(value)}</span>
        {goal != null && (
          <span className="truncate text-[12px] font-medium text-muted-foreground">
            /{Math.round(goal)}
            {unit}
          </span>
        )}
      </p>
      {goal != null && (
        <LevelMeter value={progress} color={color} blocks={8} className="mt-3 h-[6px]" />
      )}
    </div>
  );
}

export type DayStripItem = {
  key: string;
  letter: string;
  date: number;
  state: "done" | "today" | "todayDone" | "planned" | "rest" | "missed";
};

/**
 * The week as a ridge of bars: training days stand tall, rest days sit low and
 * today is the peak. Ascendr's replacement for a row of date bubbles.
 */
export function DayStrip({
  days,
  className,
  renderDay,
}: {
  days: DayStripItem[];
  className?: string;
  /** Wraps a day column, e.g. in a Link. */
  renderDay?: (day: DayStripItem, column: ReactNode) => ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      <ol className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const today = day.state === "today" || day.state === "todayDone";
          const done = day.state === "done" || day.state === "todayDone";
          const height = today ? 100 : day.state === "rest" ? 34 : 72;
          const column = (
            <span className="flex w-full flex-col items-center gap-1.5">
              <span
                className={cn(
                  "font-data text-[11px] font-semibold",
                  today ? "text-neon" : "text-muted-foreground",
                )}
              >
                {day.letter}
              </span>
              <span className="flex h-[58px] w-full items-end justify-center">
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "relative w-full max-w-[30px] rounded-[9px]",
                    done
                      ? "bg-neon"
                      : today
                        ? "border-2 border-neon bg-[repeating-linear-gradient(-45deg,color-mix(in_oklch,var(--color-neon)_30%,transparent)_0_3px,transparent_3px_7px)]"
                        : day.state === "rest"
                          ? "border border-dashed border-white/20"
                          : day.state === "missed"
                            ? "bg-white/[0.05]"
                            : "bg-white/[0.12]",
                  )}
                >
                  {today && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <AscentMark className="size-2" />
                    </span>
                  )}
                </motion.span>
              </span>
              <span
                className={cn(
                  "font-data text-[12px] font-semibold tabular-nums",
                  today ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {day.date}
              </span>
            </span>
          );
          return (
            <li key={day.key} className="flex justify-center">
              {renderDay ? renderDay(day, column) : column}
            </li>
          );
        })}
      </ol>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[78px] border-t border-dashed border-white/10"
      />
    </div>
  );
}

/** One step per exercise, rising left to right; finished steps are lit. */
export function AscentSteps({
  done,
  total,
  height = 60,
  className,
}: {
  done: number;
  total: number;
  height?: number;
  className?: string;
}) {
  const steps = Math.max(1, total);
  return (
    <div
      className={cn("flex items-end gap-[5px]", className)}
      style={{ height }}
      role="img"
      aria-label={`${done} of ${total} done`}
    >
      {Array.from({ length: steps }, (_, index) => {
        const lit = index < done;
        const next = index === done;
        return (
          <motion.span
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${28 + (72 * (index + 1)) / steps}%` }}
            transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "w-[18px] rounded-t-[6px] rounded-b-[3px]",
              lit
                ? "bg-neon"
                : next
                  ? "border-2 border-b-0 border-neon/70 bg-neon/10"
                  : "bg-white/[0.1]",
            )}
          />
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(cardClass, "flex flex-col items-center px-6 py-8 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-neon [&_svg]:size-6">
        {icon}
      </span>
      <p className="mt-4 text-[16px] font-bold">{title}</p>
      {detail && <p className="mt-1.5 max-w-[30ch] text-[13px] text-muted-foreground">{detail}</p>}
      {action && <div className="mt-5 w-full">{action}</div>}
    </div>
  );
}

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(cardClass, "flex items-center gap-3.5 rounded-[20px] p-3", className)}>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-bold">{title}</p>
        {subtitle && (
          <div className="mt-0.5 truncate text-[13px] font-medium text-neon">{subtitle}</div>
        )}
        {meta && (
          <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
            {meta}
          </div>
        )}
      </div>
      {trailing && <div className="shrink-0 text-muted-foreground">{trailing}</div>}
    </div>
  );
}

/** Stacked horizontal bar (e.g. protein / carbs / fat share of calories). */
export function StackedBar({
  segments,
  max,
  className,
}: {
  segments: { value: number; color: string; label?: string }[];
  /** Full-bar value; defaults to the segment total so the bar is always full. */
  max?: number;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const denominator = Math.max(total, max ?? 0);
  return (
    <div className={cn("flex h-2.5 gap-1 overflow-hidden rounded-full bg-white/[0.07]", className)}>
      {denominator > 0 &&
        segments.map((segment, index) => (
          <motion.span
            key={segment.label ?? index}
            initial={{ width: 0 }}
            animate={{ width: `${(Math.max(0, segment.value) / denominator) * 100}%` }}
            transition={{ duration: 0.8, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ backgroundColor: segment.color }}
          />
        ))}
    </div>
  );
}
