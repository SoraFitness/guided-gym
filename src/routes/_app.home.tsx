import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bell, Flame, Clock, Trophy, Calendar } from "lucide-react";
import { useProfile, GOAL_LABELS } from "@/lib/profile";
import { workoutRecommendationService, getWorkout } from "@/lib/workouts";
import { WorkoutCardHero, WorkoutCardRow } from "@/components/WorkoutCard";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — Pulse" }] }),
  component: HomePage,
});

const GOAL_SUBTITLES: Record<string, string> = {
  lose_weight: "Today's focus: burn calories and stay consistent",
  build_muscle: "Today's focus: strength, volume, and recovery",
  recomp: "Today's focus: build muscle while staying lean",
  endurance: "Today's focus: stamina and conditioning",
  maintain: "Today's focus: move with intention, stay sharp",
};

function HomePage() {
  const { profile } = useProfile();
  const name = profile?.name ?? "athlete";

  const recommended = useMemo(
    () => (profile ? workoutRecommendationService.recommend(profile, 8) : []),
    [profile]
  );
  const plan = useMemo(
    () => (profile ? workoutRecommendationService.weeklyPlan(profile) : []),
    [profile]
  );

  const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0
  const todayPlan = plan[todayIdx];
  const todayWorkout = todayPlan?.workoutId ? getWorkout(todayPlan.workoutId) : null;

  // ring values
  const kcalGoal = 600, kcal = 380;
  const minGoal = profile?.sessionMinutes ?? 45, mins = 22;
  const ringPct = Math.min(100, (kcal / kcalGoal) * 100);
  const subtitle = profile ? GOAL_SUBTITLES[profile.goal] : "Welcome to your training plan";

  return (
    <div className="px-5 pt-6 animate-slide-up">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Welcome back</p>
          <h1 className="text-2xl font-bold truncate">Hi, {name} 👋</h1>
          <p className="text-[11px] text-neon mt-0.5 truncate">{subtitle}</p>
        </div>
        <button className="size-11 rounded-full bg-surface grid place-items-center relative shrink-0" aria-label="Notifications">
          <Bell className="size-5" />
          <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-neon" />
        </button>
      </header>

      {/* Daily ring */}
      <section className="mt-5 rounded-3xl bg-surface p-5 flex items-center gap-5 border border-white/[0.05]">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
            <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="var(--color-neon)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(ringPct / 100) * 264} 264`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-lg font-extrabold tabular-nums">{kcal}</div>
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

      {/* Today's workout */}
      {todayWorkout && (
        <section className="mt-6">
          <SectionHeader title="Today's workout" sub={todayPlan?.label} />
          <WorkoutCardRow w={todayWorkout} />
        </section>
      )}

      {/* Recommended */}
      <section className="mt-6">
        <SectionHeader title="Recommended for you" sub="Based on your goals" linkTo="/workouts" />
        <div className="-mx-5 px-5 flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
          {recommended.map((w) => <WorkoutCardHero key={w.id} w={w} />)}
          <div className="shrink-0 w-2" />
        </div>
      </section>

      {/* Weekly plan */}
      <section className="mt-6 mb-2">
        <SectionHeader title="Your week" sub={`${profile?.daysPerWeek ?? 4} training days`} />
        <ul className="rounded-3xl bg-surface border border-white/[0.05] divide-y divide-white/[0.05] overflow-hidden">
          {plan.map((day, i) => {
            const w = day.workoutId ? getWorkout(day.workoutId) : null;
            const isToday = i === todayIdx;
            return (
              <li key={day.day}>
                {w ? (
                  <Link to="/workout/$id" params={{ id: w.id }} className="flex items-center gap-3 p-3.5 active:bg-white/[0.02]">
                    <DayChip day={day.day} isToday={isToday} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{day.label}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{w.title} · {w.duration}m</div>
                    </div>
                    <span className="text-[10px] text-neon font-semibold">Open</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 p-3.5">
                    <DayChip day={day.day} isToday={isToday} />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-muted-foreground">{day.label}</div>
                      <div className="text-[11px] text-muted-foreground">Recover and refuel</div>
                    </div>
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function DayChip({ day, isToday }: { day: string; isToday: boolean }) {
  return (
    <div className={
      "size-11 rounded-2xl grid place-items-center text-[11px] font-bold border " +
      (isToday ? "bg-neon text-neon-foreground border-neon" : "bg-white/[0.04] border-white/[0.06]")
    }>
      {day}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 text-neon" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function SectionHeader({ title, sub, linkTo }: { title: string; sub?: string; linkTo?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-neon font-semibold">View all</Link>
      )}
    </div>
  );
}

// satisfy unused import warnings used inside subtitle map
void GOAL_LABELS;
