import { Activity, Dumbbell } from "lucide-react";
import { FOCUS_LABELS, type FocusArea } from "@/lib/profile";
import { cn } from "@/lib/utils";

type WorkoutMuscleMapProps = {
  targetMuscles: FocusArea[];
  exerciseMuscles?: string[];
  className?: string;
};

const BODY_TARGETS = new Set<FocusArea>(["chest", "back", "legs", "glutes", "arms", "core"]);

export function WorkoutMuscleMap({
  targetMuscles,
  exerciseMuscles = [],
  className,
}: WorkoutMuscleMapProps) {
  const active = new Set(targetMuscles);
  const bodyTargets = targetMuscles.filter((target) => BODY_TARGETS.has(target));
  const detailLabels = [
    ...new Set(exerciseMuscles.map(normalizeMuscleLabel).filter(Boolean)),
  ].slice(0, 5);
  const isConditioning = active.has("cardio");
  const isMobility = active.has("mobility");

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-surface p-4 shadow-[0_22px_55px_-38px_oklch(0_0_0/0.95)]",
        className,
      )}
      aria-labelledby="muscle-map-title"
    >
      <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-neon/[0.08] blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">
            Session blueprint
          </p>
          <h2 id="muscle-map-title" className="mt-1 text-lg font-extrabold tracking-[-0.02em]">
            Muscles in focus
          </h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            Highlighted areas carry most of today&apos;s work.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-neon/20 bg-neon/10 px-2.5 py-1.5 text-[9px] font-bold text-neon">
          <Dumbbell className="size-3" /> {bodyTargets.length || targetMuscles.length} targets
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-[1fr_112px] gap-3 rounded-[21px] border border-white/[0.055] bg-black/20 p-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            {targetMuscles.map((target) => (
              <span
                key={target}
                className="rounded-full border border-neon/20 bg-neon/[0.08] px-2.5 py-1 text-[9px] font-bold text-neon"
              >
                {FOCUS_LABELS[target]}
              </span>
            ))}
          </div>

          {detailLabels.length > 0 && (
            <div className="mt-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-muted-foreground">
                Exercise coverage
              </p>
              <ul className="mt-2 space-y-1.5">
                {detailLabels.map((label) => (
                  <li key={label} className="flex items-center gap-2 text-[10px] font-semibold">
                    <span className="size-1.5 rounded-full bg-neon shadow-[0_0_10px_var(--color-neon)]" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(isConditioning || isMobility) && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/[0.035] p-2.5 text-[9px] leading-relaxed text-muted-foreground">
              <Activity className="mt-0.5 size-3.5 shrink-0 text-neon" />
              {isMobility
                ? "Full-body mobility and joint range are emphasized throughout."
                : "Conditioning demand is distributed across the full body."}
            </div>
          )}
        </div>

        <MuscleFigure active={active} />
      </div>

      <div className="relative mt-3 flex items-center justify-between px-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-neon" /> Primary focus
        </span>
        <span>Front + back view</span>
      </div>
    </section>
  );
}

function MuscleFigure({ active }: { active: Set<FocusArea> }) {
  const hot = (target: FocusArea) => active.has(target);
  const muscleClass = (target: FocusArea) =>
    cn(
      "transition-colors",
      hot(target) ? "fill-neon stroke-neon" : "fill-white/[0.055] stroke-white/[0.08]",
    );

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-white/[0.06] bg-[radial-gradient(circle_at_50%_42%,oklch(0.92_0.21_130/0.1),transparent_60%)] px-1 py-2">
      <svg
        viewBox="0 0 132 184"
        role="img"
        aria-label={`Front and back body map highlighting ${[...active].map((target) => FOCUS_LABELS[target]).join(", ")}`}
        className="h-[174px] w-full"
      >
        <g aria-hidden="true">
          <text x="32" y="178" textAnchor="middle" className="fill-white/35 text-[7px] font-bold">
            FRONT
          </text>
          <text x="99" y="178" textAnchor="middle" className="fill-white/35 text-[7px] font-bold">
            BACK
          </text>

          <g strokeLinecap="round" strokeLinejoin="round">
            <circle cx="32" cy="17" r="9" className="fill-white/[0.07] stroke-white/[0.12]" />
            <path
              d="M25 29Q32 25 39 29L43 66Q40 79 38 89H26Q24 78 21 66Z"
              className="fill-white/[0.07] stroke-white/[0.12]"
            />
            <path d="M21 34L14 63L10 90" className={muscleClass("arms")} strokeWidth="8" />
            <path d="M43 34L50 63L54 90" className={muscleClass("arms")} strokeWidth="8" />
            <path d="M27 89L22 126L20 159" className={muscleClass("legs")} strokeWidth="10" />
            <path d="M37 89L42 126L44 159" className={muscleClass("legs")} strokeWidth="10" />

            <path
              d="M24 37Q32 31 40 37L38 51Q32 55 26 51Z"
              className={muscleClass("chest")}
              strokeWidth="1"
            />
            <path
              d="M27 54H37L38 79Q32 84 26 79Z"
              className={muscleClass("core")}
              strokeWidth="1"
            />
            <path
              d="M24 91Q28 86 32 91L28 124Q24 126 21 122Z"
              className={muscleClass("legs")}
              strokeWidth="1"
            />
            <path
              d="M40 91Q36 86 32 91L36 124Q40 126 43 122Z"
              className={muscleClass("legs")}
              strokeWidth="1"
            />

            <circle cx="99" cy="17" r="9" className="fill-white/[0.07] stroke-white/[0.12]" />
            <path
              d="M92 29Q99 25 106 29L111 64Q108 77 105 89H93Q90 77 87 64Z"
              className="fill-white/[0.07] stroke-white/[0.12]"
            />
            <path d="M88 34L81 63L77 90" className={muscleClass("arms")} strokeWidth="8" />
            <path d="M110 34L117 63L121 90" className={muscleClass("arms")} strokeWidth="8" />
            <path d="M94 89L89 126L87 159" className={muscleClass("legs")} strokeWidth="10" />
            <path d="M104 89L109 126L111 159" className={muscleClass("legs")} strokeWidth="10" />

            <path
              d="M90 35Q99 29 108 35L105 64Q99 71 93 64Z"
              className={muscleClass("back")}
              strokeWidth="1"
            />
            <path
              d="M93 65Q99 69 105 65L104 82Q99 86 94 82Z"
              className={muscleClass("back")}
              strokeWidth="1"
            />
            <path
              d="M92 86Q99 81 106 86L104 99Q99 103 94 99Z"
              className={muscleClass("glutes")}
              strokeWidth="1"
            />
            <path
              d="M92 99Q96 95 99 100L95 126Q91 127 89 123Z"
              className={muscleClass("legs")}
              strokeWidth="1"
            />
            <path
              d="M106 99Q102 95 99 100L103 126Q107 127 109 123Z"
              className={muscleClass("legs")}
              strokeWidth="1"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

function normalizeMuscleLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
