import { AnimatePresence, motion } from "framer-motion";
import { Check, Play } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AnatomyFigure,
  AnatomyPair,
  focusFills,
  focusForRegion,
  type AnatomyFills,
} from "@/components/app/AnatomyFigure";
import {
  AscentMark,
  AscentSteps,
  DayStrip,
  Kicker,
  ScoreBar,
  scoreColor,
  type DayStripItem,
} from "@/components/app/kit";
import { RadarChart } from "@/components/app/charts";
import { BODY_SCAN_DEMO_PHOTO } from "@/lib/bodyScanDemo";
import { FACE_SCAN_DEMO_PHOTO } from "@/lib/faceScanDemo";
import { FOCUS_LABELS, type FocusArea } from "@/lib/profile";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Welcome showcase: a live phone built from the real app components.  */
/* ------------------------------------------------------------------ */

const SCREEN_WIDTH = 300;
const SCREEN_HEIGHT = Math.round((SCREEN_WIDTH * 1169) / 540);

const DEMO_WEEK: DayStripItem[] = [
  { key: "m", letter: "M", date: 6, state: "done" },
  { key: "t", letter: "T", date: 7, state: "rest" },
  { key: "w", letter: "W", date: 8, state: "done" },
  { key: "th", letter: "T", date: 9, state: "today" },
  { key: "f", letter: "F", date: 10, state: "rest" },
  { key: "s", letter: "S", date: 11, state: "planned" },
  { key: "su", letter: "S", date: 12, state: "rest" },
];

const DEMO_FILLS: AnatomyFills = {
  quads: "var(--color-neon)",
  glutes: "var(--color-neon)",
  hamstrings: "var(--color-neon)",
  abs: "var(--color-neon)",
  obliques: { color: "var(--color-neon)", hatch: true },
  calves: { color: "var(--color-neon)", hatch: true },
};

function ShowcaseScore({ score, label }: { score: number; label: string }) {
  return (
    <div>
      <p className="kicker text-[9px] text-white/85">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-0.5">
        <span
          className="text-[54px] font-bold leading-[0.9] tracking-[-0.05em]"
          style={{ color: scoreColor(score) }}
        >
          {score}
        </span>
        <span className="text-[15px] font-semibold text-white/80">/100</span>
      </p>
    </div>
  );
}

function BodyScreen() {
  return (
    <div className="px-3 pt-11">
      <Kicker accent className="text-[9px]">
        Ascendr vision
      </Kicker>
      <div
        className="chamfer relative mt-2 h-[330px] overflow-hidden rounded-[18px]"
        style={{ ["--chamfer" as string]: "22px" }}
      >
        <img src={BODY_SCAN_DEMO_PHOTO} alt="" className="size-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
        <motion.div
          initial={{ top: "-15%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
          className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-neon/25 to-neon/70"
        />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <ShowcaseScore score={84} label="Physique score" />
          <span className="font-data mt-2 inline-flex rounded-[7px] border border-white/20 bg-black/50 px-1.5 py-0.5 text-[9px] font-semibold uppercase">
            Lvl 4 · Summit
          </span>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-[16px] border border-hairline bg-surface p-3 [&_p]:text-[11px]">
        <ScoreBar label="Muscle" score={86} />
        <ScoreBar label="V-Taper" score={88} />
        <ScoreBar label="Symmetry" score={85} />
        <ScoreBar label="Core" score={78} />
      </div>
    </div>
  );
}

function TrainScreen() {
  return (
    <div className="px-3 pt-11">
      <p className="kicker text-[9px]">Thu · day 9</p>
      <p className="text-[24px] font-bold tracking-[-0.03em]">Train</p>
      <div
        className="chamfer contour-texture relative mt-2 rounded-[18px] bg-surface p-3 shadow-[inset_0_0_0_1px_var(--hairline)]"
        style={{ ["--chamfer" as string]: "20px" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <Kicker accent className="text-[9px]">
              Today&apos;s focus
            </Kicker>
            <p className="mt-1 text-[19px] font-bold leading-tight">Legs &amp; Core</p>
          </div>
          <AscentSteps done={2} total={4} height={38} />
        </div>
        <AnatomyPair
          fills={DEMO_FILLS}
          scanning
          className="mt-2 gap-3"
          figureClassName="max-h-[170px]"
        />
        <div className="mt-3 border-t border-dashed border-white/10 pt-2 [&_.h-\[58px\]]:h-[40px]">
          <DayStrip days={DEMO_WEEK} />
        </div>
      </div>
      <div className="mt-2.5 flex h-11 items-center justify-center gap-1.5 rounded-[14px] bg-neon text-[14px] font-bold text-neon-foreground">
        <Play className="size-3.5 fill-current" /> Start workout
      </div>
      <div className="mt-3 space-y-2">
        {[
          { name: "Goblet Squat", meta: "3 × 10 · 60s rest", region: "quads" as const, done: true },
          { name: "Dead Bug", meta: "3 × 12 · 45s rest", region: "abs" as const, done: true },
          {
            name: "Romanian Deadlift",
            meta: "3 × 8 · 75s rest",
            region: "hamstrings" as const,
            done: false,
          },
        ].map((row) => (
          <div
            key={row.name}
            className="flex items-center gap-2.5 rounded-[14px] border border-hairline bg-surface p-2"
          >
            <span className="relative grid size-10 place-items-center rounded-[10px] bg-white/[0.05]">
              <AnatomyFigure
                side={row.region === "hamstrings" ? "back" : "front"}
                fills={{ [row.region]: "var(--color-neon)" }}
                glow={false}
                pedestal={false}
                className="h-[34px] w-auto"
              />
              {row.done && (
                <span className="absolute inset-0 grid place-items-center rounded-[10px] bg-black/55">
                  <Check className="size-3.5 text-neon" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-bold">{row.name}</span>
              <span className="block text-[10px] font-semibold text-neon">{row.meta}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaceScreen() {
  return (
    <div className="px-3 pt-11">
      <Kicker accent className="text-[9px]">
        Ascendr vision
      </Kicker>
      <div
        className="chamfer relative mt-2 h-[250px] overflow-hidden rounded-[18px] bg-surface"
        style={{ ["--chamfer" as string]: "22px" }}
      >
        <img src={FACE_SCAN_DEMO_PHOTO} alt="" className="size-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <ShowcaseScore score={86} label="Appearance score" />
        </div>
      </div>
      <div className="mt-2.5 rounded-[16px] border border-hairline bg-surface px-1 py-2">
        <RadarChart
          size={260}
          axes={[
            { label: "Symmetry", value: 89, compare: 93 },
            { label: "Jawline", value: 87, compare: 93 },
            { label: "Skin", value: 84, compare: 93 },
            { label: "Eyes", value: 81, compare: 93 },
            { label: "Overall", value: 86, compare: 93 },
          ]}
        />
      </div>
    </div>
  );
}

const SHOWCASE = [
  { id: "body", label: "Body scan", Screen: BodyScreen },
  { id: "train", label: "Train", Screen: TrainScreen },
  { id: "face", label: "Face scan", Screen: FaceScreen },
] as const;

/** An iPhone frame cycling through real Ascendr screens, so it never shows a stale UI. */
export function WelcomeShowcase() {
  const screenRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.73);
  const [index, setIndex] = useState(0);

  useLayoutEffect(() => {
    const node = screenRef.current;
    if (!node) return;
    const update = () => setScale(node.clientWidth / SCREEN_WIDTH || 0.73);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % SHOWCASE.length),
      3200,
    );
    return () => window.clearInterval(timer);
  }, []);

  const { Screen, id } = SHOWCASE[index];

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative aspect-[540/1169] rounded-[3rem] bg-[linear-gradient(145deg,#73737c_0%,#25262a_18%,#08090a_52%,#4c4d53_100%)] p-[3px] shadow-[0_30px_90px_-28px_rgba(0,0,0,0.95),0_0_70px_-28px_var(--neon)]"
        style={{ width: "clamp(10.25rem, min(59vw, 27dvh), 16.75rem)" }}
        aria-label="Ascendr app preview"
        role="img"
      >
        <span className="absolute -left-[3px] top-[20%] h-10 w-[3px] rounded-l-full bg-zinc-500" />
        <span className="absolute -left-[3px] top-[34%] h-14 w-[3px] rounded-l-full bg-zinc-600" />
        <span className="absolute -right-[3px] top-[27%] h-16 w-[3px] rounded-r-full bg-zinc-600" />
        <div
          ref={screenRef}
          className="relative h-full w-full overflow-hidden rounded-[2.8rem] border border-black/80 bg-background"
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, transform: `scale(${scale})` }}
          >
            <div className="contour-texture absolute inset-x-0 top-0 h-60 opacity-80 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <div className="font-data absolute inset-x-0 top-3 flex justify-between px-7 text-[11px] font-semibold">
              <span>9:41</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-[3px] border border-white/70" />
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="relative"
              >
                <Screen />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10" />
          <div className="pointer-events-none absolute left-1/2 top-2.5 h-5 w-[4.5rem] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2" aria-hidden>
        {SHOWCASE.map((item, itemIndex) => (
          <span
            key={item.id}
            className={cn(
              "font-data rounded-[8px] px-2 py-1 text-[10px] font-semibold uppercase transition",
              itemIndex === index
                ? "bg-neon text-neon-foreground"
                : "bg-white/[0.06] text-muted-foreground",
            )}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ascent progress header                                              */
/* ------------------------------------------------------------------ */

export function AscentProgress({
  step,
  total,
  label,
}: {
  step: number;
  total: number;
  label: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-end gap-1" aria-hidden>
        {Array.from({ length: total }, (_, index) => {
          const reached = index < step;
          const current = index === step - 1;
          return (
            <motion.span
              key={index}
              initial={false}
              animate={{
                backgroundColor: reached ? "var(--color-neon)" : "oklch(1 0 0 / 0.09)",
              }}
              className={cn("flex-1 rounded-[3px]", current && "")}
              style={{ height: 4 + (index + 1) * 1.6 }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="kicker flex items-center gap-1.5 text-foreground">
          <AscentMark className="size-2" />
          {label}
        </span>
        <span className="kicker tabular-nums" aria-label={`Step ${step} of ${total}`}>
          {String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Focus picker: tap the muscles you want to build                     */
/* ------------------------------------------------------------------ */

const BODY_AREAS: FocusArea[] = ["chest", "back", "arms", "core", "glutes", "legs"];
const EXTRA_AREAS: FocusArea[] = ["cardio", "mobility"];

export function FocusPicker({
  value,
  onChange,
}: {
  value: FocusArea[];
  onChange: (areas: FocusArea[]) => void;
}) {
  const toggle = (area: FocusArea) =>
    onChange(value.includes(area) ? value.filter((item) => item !== area) : [...value, area]);
  const fills = focusFills(value);

  return (
    <div>
      <div className="contour-texture relative rounded-[24px] bg-surface p-4 shadow-[inset_0_0_0_1px_var(--hairline)]">
        <div className="grid grid-cols-2 gap-4">
          {(["front", "back"] as const).map((side) => (
            <div key={side} className="flex flex-col items-center">
              <AnatomyFigure
                side={side}
                fills={fills}
                onRegionPress={(region) => toggle(focusForRegion(region))}
                className="max-h-[260px]"
              />
              <span className="kicker mt-1">{side === "front" ? "Anterior" : "Posterior"}</span>
            </div>
          ))}
        </div>
        <p className="font-data mt-3 text-center text-[11px] font-semibold uppercase text-muted-foreground">
          Tap the body or the chips
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[...BODY_AREAS, ...EXTRA_AREAS].map((area) => {
          const active = value.includes(area);
          return (
            <button
              key={area}
              type="button"
              onClick={() => toggle(area)}
              aria-pressed={active}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-[14px] border text-[14px] font-semibold transition active:scale-[0.97]",
                active
                  ? "border-neon bg-neon/12 text-neon"
                  : "border-hairline bg-surface text-foreground/80",
              )}
            >
              {active && <Check className="size-3.5" strokeWidth={3} />}
              {FOCUS_LABELS[area]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ascent roadmap: projected path to the goal                          */
/* ------------------------------------------------------------------ */

const MILESTONES = [
  { week: 0, label: "Base camp" },
  { week: 4, label: "Habit locked" },
  { week: 8, label: "Visible change" },
  { week: 12, label: "Rescan" },
];

/** Weekly change used for the estimate: ~0.7% of body weight down, or a lean 0.25 kg up. */
export function projectedWeeksToGoal(currentKg: number, goalKg: number) {
  const diff = goalKg - currentKg;
  if (Math.abs(diff) < 0.5) return 0;
  const rate = diff < 0 ? Math.min(0.9, currentKg * 0.007) : 0.25;
  return Math.max(4, Math.min(52, Math.ceil(Math.abs(diff) / rate)));
}

export function AscentRoadmap({
  currentKg,
  goalKg,
  units,
  weeklyChangeKg,
}: {
  currentKg: number;
  goalKg: number;
  units: "metric" | "imperial";
  /** Pace from the calorie plan, so the chart and the targets tell the same story. */
  weeklyChangeKg?: number;
}) {
  const diffKg = goalKg - currentKg;
  const planPace =
    weeklyChangeKg && Math.sign(weeklyChangeKg) === Math.sign(diffKg) && Math.abs(diffKg) >= 0.5
      ? Math.max(4, Math.min(78, Math.ceil(Math.abs(diffKg / weeklyChangeKg))))
      : null;
  const weeks = planPace ?? projectedWeeksToGoal(currentKg, goalKg);
  const horizon = Math.max(12, weeks);
  const width = 320;
  const height = 150;
  const padX = 14;
  const top = 26;
  const bottom = 30;
  const toUnit = (kg: number) => (units === "imperial" ? Math.round(kg * 2.20462) : Math.round(kg));
  const unit = units === "imperial" ? "lb" : "kg";
  const losing = goalKg < currentKg;
  const x = (week: number) => padX + (week / horizon) * (width - padX * 2);
  // Higher on the chart always means closer to the goal: it is an ascent either way.
  const y = (progress: number) => top + (1 - progress) * (height - top - bottom);
  const eased = (week: number) => {
    if (weeks === 0) return Math.min(1, week / horizon) * 0.85 + 0.1;
    const t = Math.min(1, week / weeks);
    return 0.1 + 0.85 * (1 - Math.pow(1 - t, 1.6));
  };
  const points = Array.from({ length: 25 }, (_, index) => {
    const week = (index / 24) * horizon;
    return [x(week), y(eased(week))] as const;
  });
  const line = points.map(([px, py], index) => `${index ? "L" : "M"}${px} ${py}`).join(" ");
  const area = `${line} L${x(horizon)} ${height - bottom} L${x(0)} ${height - bottom} Z`;
  const goalDate = new Date();
  goalDate.setDate(goalDate.getDate() + weeks * 7);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="kicker">{weeks ? "Projected goal" : "Your first 12 weeks"}</p>
          <p className="mt-1 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums">
            {weeks ? (
              <>
                {toUnit(currentKg)} → <span className="text-neon">{toUnit(goalKg)}</span>
                <span className="ml-1 text-[14px] text-muted-foreground">{unit}</span>
              </>
            ) : (
              "Build the habit"
            )}
          </p>
        </div>
        {weeks > 0 && (
          <span className="font-data rounded-[8px] bg-neon/12 px-2 py-1 text-[11px] font-semibold uppercase text-neon">
            ~{goalDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-auto w-full overflow-visible">
        <defs>
          <linearGradient id="roadmap-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-neon)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--color-neon)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#roadmap-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--color-neon)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
        />
        {MILESTONES.filter((milestone) => milestone.week <= horizon).map((milestone, index) => {
          const mx = x(milestone.week);
          const my = y(eased(milestone.week));
          return (
            <motion.g
              key={milestone.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.25 }}
            >
              <line
                x1={mx}
                x2={mx}
                y1={my}
                y2={height - bottom}
                stroke="oklch(1 0 0 / 12%)"
                strokeDasharray="3 4"
              />
              <circle
                cx={mx}
                cy={my}
                r="5"
                fill="oklch(0.115 0.004 286)"
                stroke="var(--color-neon)"
                strokeWidth="2.5"
              />
              <text
                x={mx}
                y={height - 12}
                textAnchor={index === 0 ? "start" : "middle"}
                className="fill-[oklch(0.7_0.008_286)] font-data text-[9px] font-semibold uppercase"
              >
                {milestone.label}
              </text>
            </motion.g>
          );
        })}
        {weeks > 0 && (
          <g>
            <path
              d={`M${x(weeks)} ${y(0.95) - 2} l0 -20 l13 4.5 l-13 4.5`}
              fill="var(--color-neon)"
              stroke="white"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {weeks
          ? `Estimate at a steady ${
              planPace
                ? `${Math.abs(weeklyChangeKg ?? 0).toFixed(2)} kg ${losing ? "lost" : "gained"}`
                : losing
                  ? "~0.7% of body weight lost"
                  : "~0.25 kg gained"
            } per week, matching your calorie target. Real progress varies.`
          : "Milestones to aim for, not a promise. Real progress varies."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan build: a scan pass over the body while the plan is assembled.  */
/* ------------------------------------------------------------------ */

export function PlanBuildScan({
  focusAreas,
  progress,
}: {
  focusAreas: FocusArea[];
  progress: number;
}) {
  const fills = focusFills(focusAreas);
  return (
    <div className="contour-texture relative rounded-[24px] bg-surface px-6 pb-4 pt-5 shadow-[inset_0_0_0_1px_var(--hairline)]">
      <AnatomyPair
        fills={fills}
        scanning
        className="mx-auto max-w-[280px]"
        figureClassName="max-h-[220px]"
      />
      <div className="mt-4 h-[6px] overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-neon"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ ease: "linear" }}
        />
      </div>
      <p className="kicker mt-2 flex items-center justify-between">
        <span>Mapping {focusAreas.length} focus areas</span>
        <span className="tabular-nums text-foreground">{Math.round(progress * 100)}%</span>
      </p>
    </div>
  );
}
