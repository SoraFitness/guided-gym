import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Play, Flame, Clock } from "lucide-react";
import { useState } from "react";
import { workouts, type Workout } from "@/lib/workouts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Pulse" }] }),
  component: WorkoutsPage,
});

const cats = ["All", "Strength", "Cardio", "HIIT", "Mobility"] as const;

function WorkoutsPage() {
  const [cat, setCat] = useState<(typeof cats)[number]>("All");
  const [q, setQ] = useState("");

  const filtered = workouts.filter(
    (w) =>
      (cat === "All" || w.category === cat) &&
      w.title.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="px-5 pt-6 animate-slide-up">
      <h1 className="text-3xl font-bold">Workouts</h1>

      <label className="mt-5 flex items-center gap-3 h-12 rounded-full bg-surface px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search workouts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
        />
      </label>

      <div className="-mx-5 px-5 mt-5 flex gap-2 overflow-x-auto pb-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition",
              cat === c
                ? "bg-neon text-neon-foreground border-neon"
                : "bg-surface border-border text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <h2 className="mt-6 font-bold text-lg">Popular workouts</h2>
      <div className="-mx-5 px-5 mt-3 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {workouts.slice(0, 3).map((w) => <PopularCard key={w.id} w={w} />)}
      </div>

      <h2 className="mt-8 font-bold text-lg">All workouts</h2>
      <div className="mt-3 space-y-3">
        {filtered.map((w) => (
          <Link
            key={w.id}
            to="/workout/$id"
            params={{ id: w.id }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-border"
          >
            <div className="size-16 rounded-2xl bg-gradient-to-br from-neon/40 to-surface-2 grid place-items-center">
              <Play className="size-5 text-neon" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{w.title}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground">{w.level}</span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Flame className="size-3" />{w.kcal}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" />{w.minutes}m</span>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No workouts match.</p>
        )}
      </div>
    </div>
  );
}

function PopularCard({ w }: { w: Workout }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: w.id }}
      className="snap-start shrink-0 w-60 rounded-3xl bg-gradient-to-br from-neon/30 via-surface-2 to-surface p-5 border border-border relative overflow-hidden"
    >
      <div className="absolute -right-6 -bottom-6 size-32 rounded-full bg-neon/20 blur-2xl" />
      <h3 className="font-extrabold text-lg leading-tight relative">{w.title}</h3>
      <div className="mt-3 flex gap-2 text-xs relative">
        <span className="px-2 py-1 rounded-full bg-black/40">{w.kcal} kcal</span>
        <span className="px-2 py-1 rounded-full bg-black/40">{w.minutes} min</span>
      </div>
      <div className="mt-6 size-10 rounded-full bg-neon text-neon-foreground grid place-items-center relative">
        <Play className="size-4 fill-current ml-0.5" />
      </div>
    </Link>
  );
}
