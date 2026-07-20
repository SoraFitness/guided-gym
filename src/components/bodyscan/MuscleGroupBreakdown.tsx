import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import type { BodyScanAiResult } from "@/lib/bodyScan.functions";
import { cn } from "@/lib/utils";

type MuscleGroups = BodyScanAiResult["muscleGroups"];
type MuscleMetric = MuscleGroups["upperBody"]["shoulders"];

interface MuscleItem {
  label: string;
  metric: MuscleMetric;
}

interface MuscleSection {
  label: string;
  description: string;
  items: MuscleItem[];
}

const visibilityLabels: Record<MuscleMetric["visibility"], string> = {
  clear: "Clear view",
  partial: "Partial view",
  not_visible: "Not visible",
};

export function MuscleGroupBreakdown({ muscleGroups }: { muscleGroups: MuscleGroups }) {
  const sections: MuscleSection[] = [
    {
      label: "Upper body",
      description: "Shoulders, chest, back, and arms",
      items: [
        { label: "Shoulders", metric: muscleGroups.upperBody.shoulders },
        { label: "Chest", metric: muscleGroups.upperBody.chest },
        { label: "Back", metric: muscleGroups.upperBody.back },
        { label: "Arms", metric: muscleGroups.upperBody.arms },
      ],
    },
    {
      label: "Core",
      description: "Midsection and trunk definition",
      items: [{ label: "Core", metric: muscleGroups.core.core }],
    },
    {
      label: "Lower body",
      description: "Glutes, quads, hamstrings, and calves",
      items: [
        { label: "Glutes", metric: muscleGroups.lowerBody.glutes },
        { label: "Quads", metric: muscleGroups.lowerBody.quads },
        { label: "Hamstrings", metric: muscleGroups.lowerBody.hamstrings },
        { label: "Calves", metric: muscleGroups.lowerBody.calves },
      ],
    },
  ];

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon/15 text-neon">
          <Dumbbell className="size-4" />
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neon">
            Muscle group breakdown
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-white/50">
            Each region is scored separately. Areas the photo cannot show are marked instead of
            estimated.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {sections.map((section) => {
          const visibleScores = section.items
            .map(({ metric }) => metric.score)
            .filter((score): score is number => score !== null);
          const average = visibleScores.length
            ? Math.round(
                visibleScores.reduce((sum, score) => sum + score, 0) / visibleScores.length,
              )
            : null;

          return (
            <div key={section.label}>
              <div className="mb-2.5 flex items-end justify-between gap-3 border-b border-white/[0.06] pb-2.5">
                <div>
                  <h3 className="text-sm font-bold">{section.label}</h3>
                  <p className="mt-0.5 text-[10px] text-white/40">{section.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">
                    Visible avg
                  </p>
                  <p className="mt-0.5 text-lg font-black leading-none text-neon">
                    {average ?? "—"}
                  </p>
                </div>
              </div>

              <div className={cn("grid gap-2.5", section.items.length > 1 && "grid-cols-2")}>
                {section.items.map((item, index) => (
                  <MuscleCard key={item.label} item={item} delay={index * 0.05} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MuscleCard({ item, delay }: { item: MuscleItem; delay: number }) {
  const { metric } = item;
  const score = metric.score;
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border p-3",
        metric.visibility === "not_visible"
          ? "border-white/[0.05] bg-black/20"
          : "border-white/[0.07] bg-white/[0.035]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-black leading-none",
              score === null ? "text-white/30" : "text-neon",
            )}
          >
            {score ?? "N/V"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-1 text-[7px] font-bold uppercase tracking-wider",
            metric.visibility === "clear"
              ? "bg-neon/15 text-neon"
              : metric.visibility === "partial"
                ? "bg-amber-400/15 text-amber-300"
                : "bg-white/[0.06] text-white/35",
          )}
        >
          {visibilityLabels[metric.visibility]}
        </span>
      </div>

      <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-white/10">
        {score !== null && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.7, delay }}
            className="h-full rounded-full bg-neon"
          />
        )}
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-white/50">{metric.insight}</p>
    </div>
  );
}
