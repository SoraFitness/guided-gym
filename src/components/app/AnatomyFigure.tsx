import { useId } from "react";
import type { FocusArea } from "@/lib/profile";
import type { CanonicalMuscle } from "@/lib/muscleAnalytics";
import { cn } from "@/lib/utils";

export type AnatomyRegion =
  | "traps"
  | "shoulders"
  | "chest"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lats"
  | "lowerBack"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

type Shape = { region: AnatomyRegion; d: string };

// Each view is drawn as its left half on a 200-wide canvas and mirrored about x = 100.
const FRONT_HALF: Shape[] = [
  { region: "traps", d: "M90 55 Q80 61 69 67 Q81 70 93 67 Z" },
  { region: "shoulders", d: "M67 67 Q53 66 46 79 Q42 91 44 105 Q51 99 57 92 Q62 81 72 72 Z" },
  {
    region: "chest",
    d: "M98.6 73 L98.6 104 Q87 110 74 107 Q62 102 59 92 Q64 80 72 73 Q86 69 98.6 73 Z",
  },
  { region: "biceps", d: "M44 108 Q41 123 43 139 Q49 145 55 140 Q59 125 57 96 Q50 100 44 108 Z" },
  {
    region: "forearms",
    d: "M43 144 Q37 163 35 185 Q40 190 46 188 Q54 169 57 145 Q50 149 43 144 Z",
  },
  {
    region: "obliques",
    d: "M63 106 Q72 110 84 111 L85 160 Q80 171 73 168 Q67 150 65 130 Q63 118 63 106 Z",
  },
  { region: "abs", d: "M87.5 110 H98.6 V125 H87.5 Q86.6 117 87.5 110 Z" },
  { region: "abs", d: "M87 127.5 H98.6 V142.5 H87 Z" },
  { region: "abs", d: "M87 145 H98.6 V160 H87 Z" },
  { region: "abs", d: "M87 162.5 H98.6 V194 Q91 190 88 179 Z" },
  { region: "quads", d: "M67 191 Q61 224 65 263 Q71 269 76.5 265 Q75 231 80.5 196 Z" },
  {
    region: "quads",
    d: "M82 196 Q77.5 231 78.5 265 Q88 275 95 265 Q98.5 233 97.5 203 Q90.5 194 82 196 Z",
  },
  { region: "calves", d: "M69 287 Q63 317 69 350 Q75 358 81 350 Q87 318 85 287 Q77 283 69 287 Z" },
];

const BACK_HALF: Shape[] = [
  { region: "traps", d: "M98.6 50 L98.6 99 Q90 93 82 81 Q75 73 66 68 Q80 62 90 55 Z" },
  { region: "shoulders", d: "M66 68 Q53 66 46 79 Q42 91 44 105 Q51 99 57 92 Q62 81 72 73 Z" },
  {
    region: "lats",
    d: "M80 85 Q90 97 98.6 102 L98.6 141 Q89 149 79 154 Q69 139 64 112 Q62 100 66 92 Q72 87 80 85 Z",
  },
  { region: "triceps", d: "M44 108 Q41 123 43 139 Q49 145 55 140 Q59 125 57 96 Q50 100 44 108 Z" },
  {
    region: "forearms",
    d: "M43 144 Q37 163 35 185 Q40 190 46 188 Q54 169 57 145 Q50 149 43 144 Z",
  },
  { region: "lowerBack", d: "M87 147 L98.6 143.5 L98.6 181 Q92 183 86 179 Q84 162 87 147 Z" },
  { region: "glutes", d: "M98.6 184 L98.6 222 Q86 230 74 223 Q66 210 70 195 Q81 183 98.6 184 Z" },
  { region: "hamstrings", d: "M70 227 Q64 252 68 276 Q76 282 82 276 Q84 251 83.5 231 Z" },
  {
    region: "hamstrings",
    d: "M85 232 Q85.5 253 84 276 Q92 281 96 271 Q98.5 249 97.5 229 Q91 234 85 232 Z",
  },
  {
    region: "calves",
    d: "M70 287 Q62 305 66 327 Q72 335 79.5 329 Q85 307 83.5 289 Q77 283 70 287 Z",
  },
  {
    region: "calves",
    d: "M85 289 Q89 307 85 329 Q91 334 95 324 Q96.5 302 92.5 289 Q89 286 85 289 Z",
  },
];

// Silhouette behind the muscles, so the gaps between them read as anatomy lines.
const SILHOUETTE_HALF =
  "M100 44 L91 44 Q89 52 88 56 Q72 62 60 66 Q45 70 42 88 L41 106 Q39 140 33 184 Q31 200 35 209 Q41 214 47 207 Q49 198 48 189 Q56 168 59 140 L62 116 Q64 150 67 186 Q59 226 63 268 Q60 300 65 350 Q60 368 64 379 L87 380 Q90 368 86 352 Q91 318 90 284 Q96 250 99 207 L100 205 Z";

const VIEWS = { front: FRONT_HALF, back: BACK_HALF } as const;

export const INACTIVE_FILL = "oklch(0.33 0.006 286)";

/** A lit region: a solid colour, or a hatched one for secondary emphasis. */
export type AnatomyFill = string | { color: string; hatch?: boolean };
export type AnatomyFills = Partial<Record<AnatomyRegion, AnatomyFill>>;

function normalizeFill(fill: AnatomyFill | undefined) {
  if (!fill) return null;
  return typeof fill === "string" ? { color: fill, hatch: false } : { hatch: false, ...fill };
}

/**
 * Ascendr's "vision" body: an outlined wireframe where worked muscles light up
 * with a scan-line texture, secondary muscles are hatched, and the figure
 * stands on a pedestal under an optional sweeping scan beam.
 */
export function AnatomyFigure({
  side,
  fills,
  glow = true,
  scanning = false,
  pedestal = true,
  onRegionPress,
  className,
  label,
}: {
  side: "front" | "back";
  fills: AnatomyFills;
  glow?: boolean;
  scanning?: boolean;
  pedestal?: boolean;
  /** Makes regions tappable (pointer only; pair it with accessible controls). */
  onRegionPress?: (region: AnatomyRegion) => void;
  className?: string;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const shapes = VIEWS[side];
  const hatchColors = [
    ...new Set(
      Object.values(fills)
        .map(normalizeFill)
        .filter((fill): fill is { color: string; hatch: boolean } => Boolean(fill?.hatch))
        .map((fill) => fill.color),
    ),
  ];
  const hatchId = (color: string) => `hatch-${id}-${hatchColors.indexOf(color)}`;

  const renderHalf = (mirrored: boolean) => (
    <g transform={mirrored ? "translate(200 0) scale(-1 1)" : undefined}>
      {shapes.map((shape, index) => {
        const fill = normalizeFill(fills[shape.region]);
        const lit = fill && !fill.hatch;
        return (
          <g
            key={`${shape.region}-${index}`}
            onClick={onRegionPress ? () => onRegionPress(shape.region) : undefined}
            className={onRegionPress ? "cursor-pointer" : undefined}
          >
            <path
              d={shape.d}
              fill={
                !fill
                  ? "oklch(1 0 0 / 3%)"
                  : fill.hatch
                    ? `url(#${hatchId(fill.color)})`
                    : fill.color
              }
              stroke={fill ? fill.color : "oklch(1 0 0 / 24%)"}
              strokeWidth={fill ? 1 : 0.9}
              filter={lit && glow ? `url(#glow-${id})` : undefined}
              className="transition-[fill,stroke] duration-500"
            />
            {lit && <path d={shape.d} fill={`url(#scan-${id})`} pointerEvents="none" />}
          </g>
        );
      })}
    </g>
  );

  return (
    <svg
      viewBox="28 6 144 396"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("h-auto w-full overflow-visible", className)}
    >
      <defs>
        <filter id={`glow-${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={`scan-${id}`} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="oklch(0 0 0 / 18%)" />
        </pattern>
        {hatchColors.map((color) => (
          <pattern
            key={color}
            id={hatchId(color)}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="4" fill={color} fillOpacity="0.12" />
            <rect width="1.6" height="4" fill={color} fillOpacity="0.85" />
          </pattern>
        ))}
        <clipPath id={`body-${id}`}>
          <ellipse cx="100" cy="27" rx="14" ry="18" />
          <path d={SILHOUETTE_HALF} />
          <path d={SILHOUETTE_HALF} transform="translate(200 0) scale(-1 1)" />
        </clipPath>
        <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-neon)" stopOpacity="0" />
          <stop offset="0.85" stopColor="var(--color-neon)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--color-neon)" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={`pad-${id}`}>
          <stop offset="0" stopColor="var(--color-neon)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-neon)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {pedestal && (
        <g>
          <ellipse cx="100" cy="384" rx="58" ry="11" fill={`url(#pad-${id})`} />
          <ellipse
            cx="100"
            cy="384"
            rx="46"
            ry="7.5"
            fill="none"
            stroke="var(--color-neon)"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <ellipse
            cx="100"
            cy="384"
            rx="62"
            ry="12"
            fill="none"
            stroke="oklch(1 0 0 / 14%)"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
        </g>
      )}

      <g fill="oklch(0.17 0.005 286)" stroke="oklch(1 0 0 / 16%)" strokeWidth="0.9">
        <ellipse cx="100" cy="27" rx="14" ry="18" />
        <path d={SILHOUETTE_HALF} />
        <path d={SILHOUETTE_HALF} transform="translate(200 0) scale(-1 1)" />
      </g>
      <g strokeLinejoin="round">
        {renderHalf(false)}
        {renderHalf(true)}
      </g>

      {scanning && (
        <g clipPath={`url(#body-${id})`} pointerEvents="none">
          <rect
            x="28"
            y="6"
            width="144"
            height="38"
            fill={`url(#beam-${id})`}
            className="animate-scan-sweep"
            style={{ transformBox: "fill-box" }}
          />
        </g>
      )}
    </svg>
  );
}

function HudFrame({ children }: { children: React.ReactNode }) {
  const corner = "pointer-events-none absolute size-3 border-white/20";
  return (
    <div className="relative w-full px-2 pb-1 pt-2">
      <span className={cn(corner, "left-0 top-0 border-l-2 border-t-2 rounded-tl-[4px]")} />
      <span className={cn(corner, "right-0 top-0 border-r-2 border-t-2 rounded-tr-[4px]")} />
      <span className={cn(corner, "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-[4px]")} />
      <span className={cn(corner, "bottom-0 right-0 border-b-2 border-r-2 rounded-br-[4px]")} />
      {children}
    </div>
  );
}

/** Front and back figures in HUD frames, Ascendr's "vision" presentation. */
export function AnatomyPair({
  fills,
  className,
  figureClassName,
  captions = true,
  scanning = false,
  hud = true,
  label,
}: {
  fills: AnatomyFills;
  className?: string;
  figureClassName?: string;
  captions?: boolean;
  scanning?: boolean;
  hud?: boolean;
  label?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-5", className)} role="img" aria-label={label}>
      {(["front", "back"] as const).map((side) => {
        const figure = (
          <AnatomyFigure
            side={side}
            fills={fills}
            scanning={scanning}
            className={figureClassName}
          />
        );
        return (
          <figure key={side} className="flex flex-col items-center">
            {hud ? <HudFrame>{figure}</HudFrame> : figure}
            {captions && (
              <figcaption className="kicker mt-2 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-neon" />
                {side === "front" ? "Anterior" : "Posterior"}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}

const FOCUS_REGIONS: Record<FocusArea, AnatomyRegion[]> = {
  chest: ["chest", "shoulders"],
  back: ["lats", "traps", "lowerBack"],
  legs: ["quads", "hamstrings", "calves"],
  glutes: ["glutes", "hamstrings"],
  arms: ["biceps", "triceps", "forearms"],
  core: ["abs", "obliques"],
  cardio: [],
  mobility: [],
};

const CANONICAL_REGIONS: Record<CanonicalMuscle, AnatomyRegion[]> = {
  shoulders: ["shoulders", "traps"],
  chest: ["chest"],
  back: ["lats", "lowerBack"],
  arms: ["biceps", "triceps", "forearms"],
  core: ["abs", "obliques"],
  glutes: ["glutes"],
  quads: ["quads"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

export function regionsForCanonical(muscle: CanonicalMuscle) {
  return CANONICAL_REGIONS[muscle];
}

/** Maps a free-text exercise muscle label ("Upper chest", "Rear delts") to figure regions. */
export function regionsForMuscleLabel(value: string): AnatomyRegion[] {
  const label = value.toLowerCase();
  const regions = new Set<AnatomyRegion>();
  if (/chest|pec/.test(label)) regions.add("chest");
  if (/shoulder|delt/.test(label)) regions.add("shoulders");
  if (/trap|upper back|mid back/.test(label)) regions.add("traps");
  if (/lat|back/.test(label)) regions.add("lats");
  if (/lower back|spine|posterior/.test(label)) regions.add("lowerBack");
  if (/bicep/.test(label)) regions.add("biceps");
  if (/tricep/.test(label)) regions.add("triceps");
  if (/arm|forearm/.test(label)) regions.add("forearms");
  if (/\babs?\b|core/.test(label)) regions.add("abs");
  if (/oblique|core/.test(label)) regions.add("obliques");
  if (/glute|hip|posterior/.test(label)) regions.add("glutes");
  if (/quad|leg/.test(label)) regions.add("quads");
  if (/hamstring|leg|posterior/.test(label)) regions.add("hamstrings");
  if (/calf|calves|ankle|leg/.test(label)) regions.add("calves");
  if (/cardio/.test(label)) {
    regions.add("quads");
    regions.add("calves");
  }
  if (/full body/.test(label)) {
    for (const region of ["chest", "shoulders", "lats", "abs", "quads", "glutes"] as const) {
      regions.add(region);
    }
  }
  return [...regions];
}

/**
 * Highlights for a workout: exercise muscles in full accent, the workout's broader
 * target areas at reduced strength.
 */
export function workoutFills(
  targetMuscles: FocusArea[],
  exerciseMuscles: string[],
  color = "var(--color-neon)",
): AnatomyFills {
  const fills: AnatomyFills = {};
  for (const area of targetMuscles) {
    for (const region of FOCUS_REGIONS[area] ?? []) {
      fills[region] = { color, hatch: true };
    }
  }
  for (const label of exerciseMuscles) {
    for (const region of regionsForMuscleLabel(label)) fills[region] = color;
  }
  return fills;
}

const REGION_FOCUS: Record<AnatomyRegion, FocusArea> = {
  traps: "back",
  shoulders: "chest",
  chest: "chest",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abs: "core",
  obliques: "core",
  lats: "back",
  lowerBack: "back",
  glutes: "glutes",
  quads: "legs",
  hamstrings: "legs",
  calves: "legs",
};

export function focusForRegion(region: AnatomyRegion): FocusArea {
  return REGION_FOCUS[region];
}

/** Lights every region belonging to the chosen focus areas. */
export function focusFills(areas: FocusArea[], color = "var(--color-neon)"): AnatomyFills {
  const fills: AnatomyFills = {};
  for (const area of areas) {
    for (const region of FOCUS_REGIONS[area] ?? []) {
      if (REGION_FOCUS[region] === area) fills[region] = color;
    }
  }
  return fills;
}
