import { useMemo } from "react";
import { Info, Sparkles } from "lucide-react";
import {
  muscleMetricLabel,
  muscleInsightsById,
  type CanonicalMuscle,
  type MuscleInsight,
} from "@/lib/muscleAnalytics";
import { cn } from "@/lib/utils";

type MuscleHeatmapProps = {
  insights: MuscleInsight[];
  mode: "training" | "physique";
  selected: CanonicalMuscle;
  onSelect: (muscle: CanonicalMuscle) => void;
  compact?: boolean;
};

const LABELS: Record<CanonicalMuscle, string> = {
  shoulders: "Shoulders",
  chest: "Chest",
  back: "Back",
  arms: "Arms",
  core: "Core",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

function metricColor(insight: MuscleInsight | undefined, mode: MuscleHeatmapProps["mode"]) {
  const missingScan = mode === "physique" && insight?.scanScore == null;
  if (!insight || missingScan) return "oklch(0.38 0.01 255)";
  if (mode === "training") {
    if (insight.status === "Recovering" || insight.status === "High load") {
      return "var(--analytics-violet)";
    }
    if (insight.status === "Ready") return "var(--analytics-teal)";
    if (insight.status === "Needs volume") return "var(--neon)";
    return "var(--analytics-amber)";
  }
  const value = insight.scanScore ?? 0;
  if (value >= 80) return "var(--analytics-teal)";
  if (value >= 60) return "var(--neon)";
  if (value >= 40) return "var(--analytics-amber)";
  return "var(--analytics-violet)";
}

function displayValue(insight: MuscleInsight | undefined, mode: MuscleHeatmapProps["mode"]) {
  if (!insight) return "—";
  if (mode === "physique")
    return insight.scanScore == null ? "—" : `${Math.round(insight.scanScore)}`;
  return `${insight.priority}%`;
}

export function MuscleHeatmap({
  insights,
  mode,
  selected,
  onSelect,
  compact = false,
}: MuscleHeatmapProps) {
  const byId = useMemo(() => muscleInsightsById(insights), [insights]);
  const selectedInsight = byId[selected];
  const selectedColor = metricColor(selectedInsight, mode);
  const selectProps = (muscle: CanonicalMuscle) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `${LABELS[muscle]}: ${muscleMetricLabel(byId[muscle], mode)}`,
    onClick: () => onSelect(muscle),
    onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(muscle);
      }
    },
    className: cn(
      "cursor-pointer outline-none transition-[filter,opacity,transform] duration-200 hover:brightness-125 focus-visible:brightness-150",
      selected === muscle ? "opacity-100" : "opacity-[0.52] hover:opacity-90",
    ),
    style: {
      color: metricColor(byId[muscle], mode),
      filter:
        selected === muscle ? `drop-shadow(0 0 9px ${metricColor(byId[muscle], mode)})` : undefined,
    },
  });

  return (
    <div>
      <div
        className={cn(
          "relative mx-auto flex flex-col overflow-hidden rounded-[26px] border border-white/[0.07] bg-[radial-gradient(circle_at_50%_0%,oklch(0.88_0.16_165/0.09),transparent_36%),linear-gradient(145deg,oklch(0.15_0.012_255),oklch(0.09_0.009_255))]",
          compact ? "h-[264px] p-2.5" : "h-[332px] p-3",
        )}
      >
        <div className="pointer-events-none absolute inset-x-5 top-[45%] border-t border-dashed border-white/[0.055]" />
        <div className="pointer-events-none absolute inset-y-4 left-1/2 border-l border-dashed border-white/[0.055]" />
        <div className="pointer-events-none absolute -left-14 top-2 size-44 rounded-full bg-analytics-teal/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 size-48 rounded-full bg-analytics-violet/[0.09] blur-3xl" />

        {!compact && (
          <div className="relative flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full shadow-[0_0_12px_currentColor]"
                style={{ color: selectedColor, backgroundColor: selectedColor }}
              />
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  Selected region
                </p>
                <p className="truncate text-[11px] font-extrabold">
                  {selectedInsight?.label ?? "Muscle map"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-right">
              <Sparkles className="size-3 text-neon" />
              <strong className="text-[15px] font-extrabold tabular-nums">
                {displayValue(selectedInsight, mode)}
              </strong>
              <span className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                {mode === "training" ? "next" : "score"}
              </span>
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative grid min-h-0 flex-1 grid-cols-2 gap-2",
            compact ? "-mt-1 pb-5" : "mt-2 pb-7",
          )}
        >
          <BodyFigure side="front" selectProps={selectProps} compact={compact} />
          <BodyFigure side="back" selectProps={selectProps} compact={compact} />
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-2 flex items-center justify-between">
          <span className="rounded-full border border-white/[0.08] bg-black/30 px-2 py-1 text-[7px] font-black uppercase tracking-[0.16em] text-white/45">
            Tap a region
          </span>
          <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/30">
            {mode === "training" ? "readiness map" : "scan evidence"}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-2 px-1 text-[9px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" />
        <p>
          {mode === "training"
            ? "Colors show your current training state. Readiness is an estimate from recent completed sets and your weekly plan—not a medical recovery measurement."
            : "Scores reflect visible evidence in your latest scan. Regions the camera could not assess stay intentionally unscored."}
        </p>
      </div>
    </div>
  );
}

function BodyFigure({
  side,
  selectProps,
  compact,
}: {
  side: "front" | "back";
  selectProps: (muscle: CanonicalMuscle) => React.SVGProps<SVGGElement>;
  compact: boolean;
}) {
  return (
    <figure className="relative flex min-w-0 flex-col items-center justify-end">
      <div className="pointer-events-none absolute inset-x-3 bottom-5 top-2 rounded-[22px] border border-white/[0.035] bg-black/[0.08]" />
      <svg
        viewBox="0 0 180 330"
        className={cn("relative w-full", compact ? "max-w-[112px]" : "max-w-[132px]")}
        aria-hidden
      >
        <defs>
          <linearGradient id={`body-base-${side}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#363c43" />
            <stop offset="0.45" stopColor="#20252b" />
            <stop offset="1" stopColor="#111419" />
          </linearGradient>
          <linearGradient id={`body-edge-${side}`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#69717b" stopOpacity="0.42" />
            <stop offset="1" stopColor="#171b20" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ellipse cx="90" cy="313" rx="39" ry="6" fill="#000" fillOpacity="0.28" />
        <circle cx="90" cy="29" r="20" fill={`url(#body-base-${side})`} stroke="#ffffff1a" />
        <path d="M80 47 H100 L104 59 H76Z" fill={`url(#body-base-${side})`} />
        <path
          d="M61 58 Q90 45 119 58 L126 118 Q121 151 112 180 L68 180 Q59 151 54 118Z"
          fill={`url(#body-base-${side})`}
          stroke="#ffffff1a"
        />
        <path
          d="M62 59 Q43 62 34 87 L36 153 52 147 55 96 70 67Z"
          fill={`url(#body-base-${side})`}
          stroke="#ffffff14"
        />
        <path
          d="M118 59 Q137 62 146 87 L144 153 128 147 125 96 110 67Z"
          fill={`url(#body-base-${side})`}
          stroke="#ffffff14"
        />
        <path
          d="M70 177 H88 L84 298 H59 L62 234Z"
          fill={`url(#body-base-${side})`}
          stroke="#ffffff14"
        />
        <path
          d="M110 177 H92 L96 298 H121 L118 234Z"
          fill={`url(#body-base-${side})`}
          stroke="#ffffff14"
        />
        <path d="M67 181 H113" stroke={`url(#body-edge-${side})`} strokeWidth="2" />
        <path d="M90 63 V171" stroke="#ffffff10" strokeWidth="1.2" />

        {side === "front" ? (
          <>
            <g {...selectProps("shoulders")} fill="currentColor">
              <path d="M62 59 Q48 59 40 76 L56 86 70 66Z" />
              <path d="M118 59 Q132 59 140 76 L124 86 110 66Z" />
            </g>
            <g {...selectProps("chest")} fill="currentColor">
              <path d="M68 69 Q87 63 88 94 Q76 103 60 90Z" />
              <path d="M112 69 Q93 63 92 94 Q104 103 120 90Z" />
            </g>
            <g {...selectProps("arms")} fill="currentColor">
              <path d="M43 85 Q35 101 38 129 L53 126 56 91Z" />
              <path d="M137 85 Q145 101 142 129 L127 126 124 91Z" />
            </g>
            <g {...selectProps("core")} fill="currentColor">
              <path d="M66 99 Q90 106 114 99 L117 151 Q106 165 90 169 Q74 165 63 151Z" />
            </g>
            <g {...selectProps("quads")} fill="currentColor">
              <path d="M69 181 H88 L84 238 H63 L65 203Z" />
              <path d="M111 181 H92 L96 238 H117 L115 203Z" />
            </g>
            <g {...selectProps("calves")} fill="currentColor">
              <path d="M64 244 H84 L81 292 H61 L63 266Z" />
              <path d="M116 244 H96 L99 292 H119 L117 266Z" />
            </g>
          </>
        ) : (
          <>
            <g {...selectProps("shoulders")} fill="currentColor">
              <path d="M62 59 Q48 59 40 76 L56 86 70 66Z" />
              <path d="M118 59 Q132 59 140 76 L124 86 110 66Z" />
            </g>
            <g {...selectProps("back")} fill="currentColor">
              <path d="M67 68 Q90 77 113 68 L120 112 Q108 143 90 151 Q72 143 60 112Z" />
            </g>
            <g {...selectProps("arms")} fill="currentColor">
              <path d="M42 86 Q34 104 39 132 L54 126 56 91Z" />
              <path d="M138 86 Q146 104 141 132 L126 126 124 91Z" />
            </g>
            <g {...selectProps("glutes")} fill="currentColor">
              <path d="M66 155 Q88 145 89 180 Q73 185 63 173Z" />
              <path d="M114 155 Q92 145 91 180 Q107 185 117 173Z" />
            </g>
            <g {...selectProps("hamstrings")} fill="currentColor">
              <path d="M69 183 H88 L84 239 H62 L65 207Z" />
              <path d="M111 183 H92 L96 239 H118 L115 207Z" />
            </g>
            <g {...selectProps("calves")} fill="currentColor">
              <path d="M63 244 H84 L81 292 H61 L63 266Z" />
              <path d="M117 244 H96 L99 292 H119 L117 266Z" />
            </g>
          </>
        )}
      </svg>
      <figcaption className="absolute top-2 rounded-full border border-white/[0.08] bg-black/35 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.18em] text-white/55">
        {side}
      </figcaption>
    </figure>
  );
}
