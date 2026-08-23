import { useMemo, useState } from "react";
import { ChevronRight, Dumbbell, Eye, EyeOff, Target } from "lucide-react";
import { MuscleHeatmap } from "@/components/analytics/MuscleHeatmap";
import type { BodyScanAiResult } from "@/lib/bodyScan.functions";
import {
  computeMuscleInsights,
  type CanonicalMuscle,
  type MuscleScanMetric,
} from "@/lib/muscleAnalytics";
import { cn } from "@/lib/utils";

type MuscleGroups = BodyScanAiResult["muscleGroups"];
type MuscleMetric = MuscleGroups["upperBody"]["shoulders"];

type MuscleItem = {
  id: CanonicalMuscle;
  label: string;
  metric: MuscleMetric;
};

export function MuscleGroupBreakdown({ muscleGroups }: { muscleGroups: MuscleGroups }) {
  const items = useMemo<MuscleItem[]>(
    () => [
      { id: "shoulders", label: "Shoulders", metric: muscleGroups.upperBody.shoulders },
      { id: "chest", label: "Chest", metric: muscleGroups.upperBody.chest },
      { id: "back", label: "Back", metric: muscleGroups.upperBody.back },
      { id: "arms", label: "Arms", metric: muscleGroups.upperBody.arms },
      { id: "core", label: "Core", metric: muscleGroups.core.core },
      { id: "glutes", label: "Glutes", metric: muscleGroups.lowerBody.glutes },
      { id: "quads", label: "Quads", metric: muscleGroups.lowerBody.quads },
      { id: "hamstrings", label: "Hamstrings", metric: muscleGroups.lowerBody.hamstrings },
      { id: "calves", label: "Calves", metric: muscleGroups.lowerBody.calves },
    ],
    [muscleGroups],
  );
  const ranked = useMemo(
    () => [...items].sort((a, b) => (b.metric.score ?? -1) - (a.metric.score ?? -1)),
    [items],
  );
  const scanScores = useMemo(
    () =>
      Object.fromEntries(items.map((item) => [item.id, item.metric])) as Partial<
        Record<CanonicalMuscle, MuscleScanMetric>
      >,
    [items],
  );
  const insights = useMemo(() => computeMuscleInsights({ history: [], scanScores }), [scanScores]);
  const [selected, setSelected] = useState<CanonicalMuscle>(ranked[0]?.id ?? "shoulders");
  const selectedItem = items.find((item) => item.id === selected) ?? items[0];

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-neon/15 text-neon">
            <Dumbbell className="size-4" />
          </div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">
              Muscle development
            </h2>
            <p className="mt-1 text-sm font-bold">Nine regions. Ranked individually.</p>
          </div>
        </div>
        <span className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white/38">
          Scan evidence
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">
        Tap a highlighted region to see the evidence. Areas the photos did not show clearly stay
        explicitly unscored.
      </p>

      <div className="mt-4">
        <MuscleHeatmap
          insights={insights}
          mode="physique"
          selected={selected}
          onSelect={setSelected}
          compact
        />
      </div>

      {selectedItem && (
        <div className="mt-4 rounded-[22px] border border-white/[0.07] bg-black/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                  {selectedItem.label}
                </p>
                <VisibilityBadge visibility={selectedItem.metric.visibility} />
              </div>
              <p className="mt-2 max-w-[260px] text-[10px] leading-relaxed text-white/50">
                {selectedItem.metric.insight}
              </p>
            </div>
            <strong
              className={cn(
                "text-3xl font-black tabular-nums",
                selectedItem.metric.score == null ? "text-white/20" : "text-neon",
              )}
            >
              {selectedItem.metric.score ?? "—"}
            </strong>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-[16px] border border-white/[0.055] bg-white/[0.035] p-3">
            <Target className="mt-0.5 size-3.5 shrink-0 text-analytics-teal" />
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-analytics-teal">
                Recommended next action
              </p>
              <p className="mt-1 text-[9px] leading-relaxed text-white/48">
                {nextAction(selectedItem)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
            Ranked regions
          </p>
          <p className="text-[8px] font-bold text-white/25">Visible scores first</p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[370px]:grid-cols-2">
          {ranked.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={cn(
                "tap flex items-center gap-2 rounded-[17px] border px-3 py-2.5 text-left transition",
                selected === item.id
                  ? "border-neon/25 bg-neon/[0.07]"
                  : "border-white/[0.055] bg-black/15",
              )}
            >
              <span className="w-4 text-[9px] font-black text-white/25">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold">{item.label}</span>
              <span
                className={cn(
                  "text-[13px] font-black tabular-nums",
                  item.metric.score == null ? "text-white/20" : "text-neon",
                )}
              >
                {item.metric.score ?? "N/V"}
              </span>
              <ChevronRight className="size-3 text-white/20" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function VisibilityBadge({ visibility }: { visibility: MuscleMetric["visibility"] }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider",
        visibility === "clear"
          ? "bg-neon/10 text-neon"
          : visibility === "partial"
            ? "bg-analytics-amber/10 text-analytics-amber"
            : "bg-white/[0.05] text-white/28",
      )}
    >
      {visibility === "not_visible" ? (
        <EyeOff className="size-2.5" />
      ) : (
        <Eye className="size-2.5" />
      )}
      {visibility === "clear" ? "Clear" : visibility === "partial" ? "Partial" : "Not visible"}
    </span>
  );
}

function nextAction(item: MuscleItem) {
  if (item.metric.score == null || item.metric.visibility === "not_visible") {
    return `Include a clear ${item.label.toLowerCase()} angle in the next scan before drawing a conclusion.`;
  }
  if (item.metric.visibility === "partial") {
    return `Use the same lighting and a clearer angle next time; treat this ${item.label.toLowerCase()} score as directional.`;
  }
  if (item.metric.score < 55) {
    return `Prioritize consistent weekly ${item.label.toLowerCase()} volume and progressive overload, then compare under matching photo conditions.`;
  }
  return `Keep ${item.label.toLowerCase()} training consistent and use the same pose and lighting to make the next comparison meaningful.`;
}
