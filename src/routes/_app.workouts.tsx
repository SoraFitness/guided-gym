import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useProfile, GOAL_LABELS } from "@/lib/profile";
import { workoutRecommendationService, type Category } from "@/lib/workouts";
import { WorkoutCardTile } from "@/components/WorkoutCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Pulse" }] }),
  component: WorkoutsPage,
});

const chips = ["Recommended", "Strength", "HIIT", "Cardio", "Core", "Mobility", "All"] as const;
type Chip = (typeof chips)[number];

function WorkoutsPage() {
  const { profile } = useProfile();
  const [chip, setChip] = useState<Chip>("Recommended");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    if (!profile) return [];
    const cat: Category | "All" | "Recommended" =
      chip === "Recommended" || chip === "All" ? chip : (chip as Category);
    const items = workoutRecommendationService.filterByCategory(profile, cat);
    return q ? items.filter((w) => w.title.toLowerCase().includes(q.toLowerCase())) : items;
  }, [profile, chip, q]);

  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <h1 className="text-3xl font-bold">Workouts</h1>
      {profile && (
        <p className="text-xs text-muted-foreground mt-1">
          Tailored to {GOAL_LABELS[profile.goal].toLowerCase()} · {profile.daysPerWeek} days / wk
        </p>
      )}

      <label className="mt-5 flex items-center gap-3 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search workouts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
        />
      </label>

      <div className="-mx-5 px-5 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full text-xs font-semibold border transition",
              chip === c
                ? "bg-neon text-neon-foreground border-neon"
                : "bg-white/[0.04] border-white/[0.06] text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {list.map((w) => <WorkoutCardTile key={w.id} w={w} />)}
      </div>
      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-sm">No workouts match.</p>
      )}
    </div>
  );
}
