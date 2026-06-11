import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Flame, Clock, Trophy, Play } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { workouts } from "@/lib/workouts";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — Pulse" }] }),
  component: HomePage,
});

function HomePage() {
  const { profile } = useProfile();
  const name = profile?.name ?? "athlete";
  const recommended = workouts.slice(0, 3);
  const today = workouts.slice(1, 4);

  // ring values
  const kcalGoal = 600, kcal = 380;
  const minGoal = 45, mins = 22;
  const ringPct = Math.min(100, (kcal / kcalGoal) * 100);

  return (
    <div className="px-5 pt-6 animate-slide-up">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back</p>
          <h1 className="text-2xl font-bold">Hi, {name} 👋</h1>
        </div>
        <button className="size-11 rounded-full bg-surface grid place-items-center relative">
          <Bell className="size-5" />
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-neon" />
        </button>
      </header>

      {/* Daily ring card */}
      <section className="mt-6 rounded-3xl bg-surface p-5 flex items-center gap-5">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.3 0 0)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="var(--color-neon)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(ringPct / 100) * 264} 264`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-xl font-extrabold">{kcal}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <Stat icon={Flame} label="Calories" value={`${kcal} / ${kcalGoal}`} />
          <Stat icon={Clock} label="Minutes" value={`${mins} / ${minGoal}`} />
          <Stat icon={Trophy} label="Streak" value="6 days" />
        </div>
      </section>

      {/* Recommended */}
      <section className="mt-8">
        <SectionHeader title="Recommended for you" />
        <div className="-mx-5 px-5 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {recommended.map((w) => (
            <Link
              key={w.id}
              to="/workout/$id"
              params={{ id: w.id }}
              className="snap-start shrink-0 w-64 rounded-3xl bg-surface overflow-hidden border border-border"
            >
              <div className="h-32 bg-gradient-to-br from-neon/30 via-surface to-surface-2 relative">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="size-12 rounded-full bg-neon text-neon-foreground grid place-items-center">
                    <Play className="size-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold">{w.title}</h3>
                <div className="mt-2 flex gap-2 text-xs">
                  <Chip>{w.kcal} kcal</Chip>
                  <Chip>{w.minutes} min</Chip>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Today's plan */}
      <section className="mt-6">
        <SectionHeader title="Today's plan" />
        <div className="space-y-3">
          {today.map((w) => (
            <Link
              key={w.id}
              to="/workout/$id"
              params={{ id: w.id }}
              className="flex items-center gap-4 p-3 rounded-2xl bg-surface border border-border"
            >
              <div className="size-14 rounded-xl bg-gradient-to-br from-neon to-emerald-400 grid place-items-center text-neon-foreground font-bold">
                {w.minutes}'
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold truncate">{w.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground">{w.level}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{w.category} · {w.kcal} kcal</p>
              </div>
              <Play className="size-5 text-neon" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-neon" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold">{value}</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-1 rounded-full bg-surface-2 text-muted-foreground">{children}</span>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <button className="text-xs text-neon font-medium">View all</button>
    </div>
  );
}
