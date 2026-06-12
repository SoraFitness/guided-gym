import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Flame, Trophy, Calendar, Apple, Dumbbell, Zap } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { workoutRecommendationService, getWorkout } from "@/lib/workouts";
import { WorkoutCardHero, WorkoutCardRow } from "@/components/WorkoutCard";
import { useNutrition } from "@/lib/nutritionStore";
import { useProgress } from "@/lib/progressStore";
import { WeeklyReportCard } from "@/components/weekly/WeeklyReportCard";
import { QuickLogFab } from "@/components/weekly/QuickLogFab";
import { listNotifications } from "@/lib/weeklyReport.functions";

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

  const { totals, goals } = useNutrition();
  const progress = useProgress(profile?.sessionMinutes ?? 30);

  const recommended = useMemo(
    () => (profile ? workoutRecommendationService.recommend(profile, 8) : []),
    [profile]
  );
  const plan = useMemo(
    () => (profile ? workoutRecommendationService.weeklyPlan(profile) : []),
    [profile]
  );

  const todayIdx = (new Date().getDay() + 6) % 7;
  const todayPlan = plan[todayIdx];
  const todayWorkout = todayPlan?.workoutId ? getWorkout(todayPlan.workoutId) : null;

  const subtitle = profile ? GOAL_SUBTITLES[profile.goal] : "Welcome to your training plan";

  const listNotif = useServerFn(listNotifications);
  const { data: notifs } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotif(), staleTime: 60_000 });
  const unread = (notifs ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="px-5 pt-6 animate-slide-up">
      <header data-tour="tour-home-header" className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">Welcome back</p>
          <h1 className="text-2xl font-bold truncate">Hi, {name} 👋</h1>
          <p className="text-[11px] text-neon mt-0.5 truncate">{subtitle}</p>
        </div>
        <Link to="/notifications" className="size-11 rounded-full bg-surface grid place-items-center relative shrink-0" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-neon" />}
        </Link>
      </header>

      <div className="mt-5"><WeeklyReportCard /></div>


      {/* Today's Nutrition */}
      <section data-tour="tour-nutrition-card" className="mt-5 rounded-3xl bg-surface p-5 border border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Apple className="size-4 text-neon" />
            <h2 className="font-bold text-sm">Today's Nutrition</h2>
          </div>
          <Link to="/nutrition" className="text-[11px] text-neon font-semibold">Open</Link>
        </div>

        <div className="flex items-center gap-5">
          <CalorieRing consumed={totals.kcal} goal={goals.kcal} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tabular-nums">{totals.kcal}</span>
              <span className="text-xs text-muted-foreground">/ {goals.kcal} kcal</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {totals.itemCount === 0 ? "Nothing logged yet" : `${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"} logged`}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/10 border border-neon/20">
              <Flame className="size-3 text-neon" />
              <span className="text-[11px] font-semibold text-neon tabular-nums">{totals.remaining} kcal left</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <MacroBar label="Protein" value={totals.protein} goal={goals.protein} hue="oklch(0.92 0.21 130)" />
          <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} hue="oklch(0.82 0.17 65)" />
          <MacroBar label="Fat" value={totals.fat} goal={goals.fat} hue="oklch(0.72 0.18 25)" />
        </div>

        {totals.itemCount === 0 && (
          <Link
            to="/nutrition"
            className="mt-4 flex items-center justify-center gap-1.5 h-10 rounded-full bg-neon/10 border border-neon/20 text-neon text-[12px] font-semibold"
          >
            <Zap className="size-3.5" /> Log your first meal
          </Link>
        )}
      </section>

      {/* Today's Activity */}
      <section data-tour="tour-progress-card" className="mt-4 rounded-3xl bg-surface p-5 border border-white/[0.05]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="size-4 text-neon" />
            <h2 className="font-bold text-sm">Today's Activity</h2>
          </div>
          <Link to="/workouts" className="text-[11px] text-neon font-semibold">Open</Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ActivityStat label="Minutes" value={`${progress.workoutMinutesToday}`} sub={`/ ${progress.workoutMinutesTarget}`} />
          <ActivityStat label="This week" value={`${progress.completedThisWeek}`} sub="workouts" />
          <ActivityStat
            icon={<Trophy className="size-3.5 text-neon" />}
            label="Streak"
            value={`${progress.streakDays}`}
            sub={progress.streakDays === 1 ? "day" : "days"}
          />
        </div>
      </section>

      {todayWorkout && (
        <section data-tour="tour-today-workout" className="mt-6">
          <SectionHeader title="Today's workout" sub={todayPlan?.label} />
          <WorkoutCardRow w={todayWorkout} />
        </section>
      )}

      <section className="mt-6">
        <SectionHeader title="Recommended for you" sub="Based on your goals" linkTo="/workouts" />
        <div className="-mx-5 px-5 flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
          {recommended.map((w) => <WorkoutCardHero key={w.id} w={w} />)}
          <div className="shrink-0 w-2" />
        </div>
      </section>

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

function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = goal ? Math.min(100, (consumed / goal) * 100) : 0;
  const C = 2 * Math.PI * 42;
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="-rotate-90 size-full">
        <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke="var(--color-neon)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-lg font-extrabold tabular-nums">{consumed}</div>
          <div className="text-[10px] text-muted-foreground">kcal</div>
        </div>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, hue }: { label: string; value: number; goal: number; hue: string }) {
  const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.05] p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{goal}g</span>
      </div>
      <div className="mt-0.5 text-sm font-bold tabular-nums leading-none">
        {value}<span className="text-[10px] text-muted-foreground font-medium">g</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: hue }} />
      </div>
    </div>
  );
}

function ActivityStat({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.05] p-3">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-extrabold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{sub}</div>
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

function SectionHeader({ title, sub, linkTo }: { title: string; sub?: string; linkTo?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {linkTo && <Link to={linkTo} className="text-xs text-neon font-semibold">View all</Link>}
    </div>
  );
}
