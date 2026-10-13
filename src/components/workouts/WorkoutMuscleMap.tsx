import { Activity } from "lucide-react";
import { FOCUS_LABELS, type FocusArea } from "@/lib/profile";
import { AnatomyPair, workoutFills } from "@/components/app/AnatomyFigure";
import { cardClass } from "@/components/app/kit";
import { cn } from "@/lib/utils";

type WorkoutMuscleMapProps = {
  targetMuscles: FocusArea[];
  exerciseMuscles?: string[];
  className?: string;
};

export function WorkoutMuscleMap({
  targetMuscles,
  exerciseMuscles = [],
  className,
}: WorkoutMuscleMapProps) {
  const active = new Set(targetMuscles);
  const isConditioning = active.has("cardio");
  const isMobility = active.has("mobility");

  return (
    <section className={cn(cardClass, "p-5", className)} aria-labelledby="muscle-map-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="muscle-map-title" className="text-[18px] font-bold tracking-[-0.02em]">
          Muscles worked
        </h2>
        <span className="text-[13px] font-medium text-muted-foreground">Front + back</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {targetMuscles.map((target) => (
          <span
            key={target}
            className="rounded-full bg-neon/12 px-3 py-1 text-[13px] font-semibold text-neon"
          >
            {FOCUS_LABELS[target]}
          </span>
        ))}
      </div>

      <AnatomyPair
        fills={workoutFills(targetMuscles, exerciseMuscles)}
        className="mx-auto mt-5 max-w-[280px]"
        figureClassName="max-h-[210px]"
        label={`Body map highlighting ${targetMuscles.map((target) => FOCUS_LABELS[target]).join(", ")}`}
      />

      {(isConditioning || isMobility) && (
        <p className="mt-4 flex items-start gap-2 rounded-[14px] bg-white/[0.04] p-3 text-[13px] text-muted-foreground">
          <Activity className="mt-0.5 size-4 shrink-0 text-neon" />
          {isMobility
            ? "Full-body mobility and joint range throughout."
            : "Conditioning load spread across the whole body."}
        </p>
      )}
    </section>
  );
}
