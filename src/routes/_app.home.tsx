import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Apple,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  HeartPulse,
  MessageCircle,
  Play,
  RefreshCw,
  ScanLine,
  Sparkles,
  Target,
  Trophy,
  Utensils,
  UserRound,
  Zap,
} from "lucide-react";
import { FOCUS_LABELS, useProfile, type FocusArea } from "@/lib/profile";
import { getWorkout, workoutRecommendationService, type Workout } from "@/lib/workouts";
import { weeklyScheduleService, type WeeklyScheduleDay } from "@/lib/weeklySchedule";
import { WorkoutCardHero } from "@/components/WorkoutCard";
import { AscendrLogo } from "@/components/AscendrLogo";
import { useNutrition } from "@/lib/nutritionStore";
import { useProgress } from "@/lib/progressStore";
import { WeeklyReportCard } from "@/components/weekly/WeeklyReportCard";
import { QuickLogFab } from "@/components/weekly/QuickLogFab";
import { listNotifications } from "@/lib/weeklyReport.functions";
import { cn } from "@/lib/utils";
import { getActiveWorkoutPlan, useSavedWorkoutPlans } from "@/lib/workoutPlanStore";
import { useCompletedWorkouts, type CompletedWorkout } from "@/lib/workoutSessionStore";
import { computeMuscleInsights, type MuscleInsight } from "@/lib/muscleAnalytics";
import { scoreLogEntries, type NutritionQuality } from "@/lib/nutritionQuality";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — Ascendr" }] }),
  component: HomePage,
});

const GOAL_SUBTITLES: Record<string, string> = {
  lose_weight: "Lean down without losing momentum",
  build_muscle: "Build strength, size, and consistency",
  recomp: "Build muscle while staying lean",
  endurance: "Improve stamina and conditioning",
  get_stronger: "Get stronger, one session at a time",
  overall: "Move better and feel stronger",
  maintain: "Stay sharp and keep moving forward",
};

function HomePage() {
  const { profile } = useProfile();
  const displayName =
    profile?.name?.trim().toLowerCase() === "sahil" ? "Admin" : getDisplayName(profile?.name);
  const { totals, goals, todayEntries } = useNutrition();
  const progress = useProgress(profile?.sessionMinutes ?? 30);
  const completedWorkouts = useCompletedWorkouts();
  const [dismissedRecoveryCheck, setDismissedRecoveryCheck] = useState(false);
  const savedPlans = useSavedWorkoutPlans();
  const activePlan = useMemo(
    () => getActiveWorkoutPlan(savedPlans, profile),
    [savedPlans, profile],
  );

  const schedule = useMemo(
    () =>
      profile ? weeklyScheduleService.generateSchedule(profile, activePlan?.workoutIds ?? []) : [],
    [profile, activePlan?.workoutIds],
  );
  const todayPlan = schedule.find((day) => day.isToday);
  const scheduledWorkout = todayPlan?.workoutId ? getWorkout(todayPlan.workoutId) : null;
  const recoveryWorkout = getWorkout("mobility-recovery");
  const heroWorkout = scheduledWorkout ?? recoveryWorkout ?? null;

  const recommended = useMemo(
    () =>
      profile
        ? workoutRecommendationService
            .recommend(profile, 10)
            .filter((workout) => workout.id !== scheduledWorkout?.id)
            .slice(0, 5)
        : [],
    [profile, scheduledWorkout?.id],
  );
  const adaptiveInsight = useMemo(
    () => getAdaptiveTrainingInsight(completedWorkouts, heroWorkout, recommended),
    [completedWorkouts, heroWorkout, recommended],
  );
  const muscleInsights = useMemo(
    () =>
      computeMuscleInsights({
        history: completedWorkouts,
        experience: profile?.experience,
        focusAreas: profile?.focusAreas,
      }),
    [completedWorkouts, profile?.experience, profile?.focusAreas],
  );
  const fuelQuality = useMemo(
    () => scoreLogEntries(todayEntries, goals.protein).day,
    [todayEntries, goals.protein],
  );

  const listNotif = useServerFn(listNotifications);
  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotif(),
    staleTime: 60_000,
  });
  const unread = (notifs ?? []).filter((notification) => !notification.read_at).length;

  const subtitle = profile
    ? (GOAL_SUBTITLES[profile.goal] ?? "Keep building toward your goal")
    : "Your training, nutrition, and progress in one place";

  return (
    <div className="animate-slide-up px-4 pb-6 pt-4 sm:px-5 sm:pb-8 sm:pt-5">
      <header data-tour="tour-home-header" className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <AscendrLogo decorative className="size-[18px] rounded-md border border-white/10" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neon">
              {formatToday()}
            </p>
          </div>
          <h1 className="mt-1 truncate text-[clamp(21px,6.4vw,25px)] font-extrabold leading-tight tracking-[-0.03em]">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to="/notifications"
            className="relative grid h-[44px] w-[44px] place-items-center rounded-2xl border border-white/[0.06] bg-surface shadow-[0_14px_30px_-18px_oklch(0_0_0/0.9)] transition active:scale-95"
            aria-label={unread ? `${unread} unread notifications` : "Notifications"}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-neon px-1 text-[8px] font-extrabold leading-4 text-neon-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label="Open profile"
            className="grid h-[44px] w-[44px] place-items-center overflow-hidden rounded-2xl border border-neon/20 bg-gradient-to-br from-neon/20 to-surface text-neon shadow-[0_14px_30px_-18px_var(--color-neon)] transition active:scale-95"
          >
            <UserRound className="size-5" />
          </Link>
        </div>
      </header>

      {adaptiveInsight && !dismissedRecoveryCheck && (
        <section className="mt-4">
          <AdaptivePlanCard
            insight={adaptiveInsight}
            onKeepPlan={() => setDismissedRecoveryCheck(true)}
          />
        </section>
      )}

      <section
        data-tour="tour-today-workout"
        className={cn(adaptiveInsight && !dismissedRecoveryCheck ? "mt-3" : "mt-4 sm:mt-5")}
      >
        <TodayHero
          plan={todayPlan}
          workout={heroWorkout}
          completed={Boolean(todayPlan?.isCompleted || progress.workoutMinutesToday > 0)}
          muscleInsights={muscleInsights}
          fuelQuality={fuelQuality}
        />
      </section>

      <section className="mt-6">
        <SectionHeader
          eyebrow="Today"
          title="Your daily targets"
          action="View progress"
          linkTo="/progress"
        />
        <div className="grid grid-cols-2 gap-3">
          <NutritionSnapshot
            consumed={totals.kcal}
            remaining={totals.remaining}
            calorieGoal={goals.kcal}
            protein={totals.protein}
            proteinGoal={goals.protein}
            itemCount={totals.itemCount}
          />
          <ActivitySnapshot
            completed={progress.completedThisWeek}
            target={profile?.daysPerWeek ?? 4}
            minutes={progress.workoutMinutesToday}
            minuteTarget={progress.workoutMinutesTarget}
            streak={progress.streakDays}
          />
        </div>
      </section>

      <section className="mt-6">
        <SectionHeader eyebrow="Shortcuts" title="Keep moving" />
        <div className="grid grid-cols-4 gap-2.5">
          <QuickAction to="/nutrition" icon={<Utensils />} label="Log food" />
          <QuickAction to="/coach" icon={<MessageCircle />} label="Ask coach" />
          <QuickAction to="/scan" icon={<ScanLine />} label="Run scan" />
          <QuickAction to="/workouts" icon={<Sparkles />} label="Build plan" />
        </div>
      </section>

      {schedule.length > 0 && (
        <section className="mt-6">
          <SectionHeader
            eyebrow="Training plan"
            title="Your week"
            action="Full schedule"
            linkTo="/workouts"
          />
          <WeekRail schedule={schedule} />
        </section>
      )}

      <section className="mt-6">
        <WeeklyReportCard compact />
      </section>

      {recommended.length > 0 && (
        <section className="mt-7">
          <SectionHeader
            eyebrow="Personalized"
            title="More picked for you"
            action="View all"
            linkTo="/workouts"
          />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 scrollbar-none sm:-mx-5 sm:px-5">
            {recommended.map((workout) => (
              <WorkoutCardHero key={workout.id} w={workout} className="w-[218px]" />
            ))}
            <div className="w-1 shrink-0" />
          </div>
        </section>
      )}

      <QuickLogFab />
    </div>
  );
}

type AdaptiveTrainingInsight = {
  overlap: FocusArea[];
  alternative: Workout;
  hoursSince: number;
};

function AdaptivePlanCard({
  insight,
  onKeepPlan,
}: {
  insight: AdaptiveTrainingInsight;
  onKeepPlan: () => void;
}) {
  const muscleList = formatAreaList(insight.overlap);
  const timing = insight.hoursSince < 24 ? "within the last day" : "yesterday";

  return (
    <div className="relative overflow-hidden rounded-[23px] border border-neon/20 bg-gradient-to-br from-neon/[0.11] via-surface to-surface p-4 shadow-[0_20px_42px_-30px_var(--color-neon)]">
      <div className="pointer-events-none absolute -right-8 -top-12 size-32 rounded-full bg-neon/10 blur-3xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-neon text-neon-foreground shadow-[0_0_24px_-10px_var(--color-neon)]">
          <RefreshCw className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.19em] text-neon">
            Smart recovery check
          </p>
          <h2 className="mt-1 text-[15px] font-extrabold leading-tight">
            Give {muscleList} more recovery?
          </h2>
          <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
            You trained {muscleList} {timing}. Switching focus may keep today&apos;s work more
            productive.
          </p>
        </div>
      </div>
      <div className="relative mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Link
          to="/workout/$id"
          params={{ id: insight.alternative.id }}
          className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-neon px-4 text-[11px] font-extrabold text-neon-foreground transition active:scale-[0.98]"
        >
          Switch to{" "}
          {insight.alternative.targetMuscles[0]
            ? FOCUS_LABELS[insight.alternative.targetMuscles[0]]
            : "another focus"}
          <ChevronRight className="size-3.5 shrink-0" />
        </Link>
        <button
          type="button"
          onClick={onKeepPlan}
          className="h-10 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-[10px] font-bold text-white/75"
        >
          Keep plan
        </button>
      </div>
    </div>
  );
}

function TodayHero({
  plan,
  workout,
  completed,
  muscleInsights,
  fuelQuality,
}: {
  plan?: WeeklyScheduleDay;
  workout: Workout | null;
  completed: boolean;
  muscleInsights: MuscleInsight[];
  fuelQuality: NutritionQuality;
}) {
  const isRecovery = !plan || plan.isRestDay || !plan.workoutId;
  const primaryPath = isRecovery ? "/workout/$id" : "/workout/$id/session";
  const workoutId = workout?.id ?? "mobility-recovery";
  const duration = isRecovery
    ? (workout?.duration ?? 15)
    : (plan?.duration ?? workout?.duration ?? 30);
  const exerciseCount = isRecovery
    ? (workout?.exercises.length ?? 0)
    : (plan?.exercises.length ?? 0);
  const calories = isRecovery
    ? (workout?.calories ?? 0)
    : (plan?.estimatedCalories ?? workout?.calories ?? 0);

  return (
    <div className="relative min-h-[385px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-surface-2 shadow-[0_32px_75px_-32px_oklch(0_0_0/0.95)] sm:min-h-[410px] sm:rounded-[32px]">
      {workout?.image && (
        <img
          src={workout.image}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: workout.imagePosition }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,oklch(0.92_0.21_130/0.16),transparent_38%)]" />

      <div className="relative flex min-h-[385px] flex-col p-4 sm:min-h-[410px] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] backdrop-blur-md">
            {isRecovery ? (
              <HeartPulse className="size-3 text-neon" />
            ) : (
              <Zap className="size-3 text-neon" />
            )}
            Today&apos;s brief
          </span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md",
              completed
                ? "border-emerald-300/25 bg-emerald-300/15 text-emerald-300"
                : "border-white/10 bg-black/45 text-white/75",
            )}
          >
            {completed ? "Completed" : isRecovery ? "Recharge" : plan?.difficulty}
          </span>
        </div>

        <div className="mt-auto max-w-[92%]">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon">
            {isRecovery ? "Reset · Restore · Recover" : plan?.splitLabel}
          </p>
          <h2 className="mt-2 text-[26px] font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-[30px]">
            {isRecovery ? "Recovery is part of the plan." : (workout?.title ?? plan?.workoutTitle)}
          </h2>
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/65">
            {isRecovery
              ? "Loosen up, restore range of motion, and come back ready for your next session."
              : plan?.focus || workout?.description}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              to="/progress"
              className="rounded-[17px] border border-white/10 bg-black/45 p-3 backdrop-blur-md transition active:scale-[0.98]"
            >
              <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-analytics-teal">
                Train next
              </p>
              <p className="mt-1 truncate text-[12px] font-extrabold">
                {muscleInsights
                  .slice(0, 2)
                  .map((item) => item.label)
                  .join(" + ")}
              </p>
              <p className="mt-0.5 text-[9px] text-white/50">
                {muscleInsights[0]?.priority ?? 0}% priority · estimated
              </p>
            </Link>
            <Link
              to="/nutrition"
              className="rounded-[17px] border border-white/10 bg-black/45 p-3 backdrop-blur-md transition active:scale-[0.98]"
            >
              <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-analytics-amber">
                Fuel quality
              </p>
              <p className="mt-1 text-[12px] font-extrabold">
                {fuelQuality.score == null
                  ? "Not scored yet"
                  : `${fuelQuality.score} · ${fuelQuality.band}`}
              </p>
              <p className="mt-0.5 text-[9px] text-white/50">
                {fuelQuality.score == null
                  ? "Log food to see quality"
                  : `${fuelQuality.confidence} nutrition data`}
              </p>
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-white/80">
            <HeroStat icon={<Clock3 />} label={`${duration} min`} />
            <HeroStat icon={<Dumbbell />} label={`${exerciseCount} exercises`} />
            {calories > 0 && <HeroStat icon={<Flame />} label={`~${calories} kcal`} />}
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <Link
              to={primaryPath}
              params={{ id: workoutId }}
              className="flex h-12 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-full bg-neon px-5 text-[13px] font-extrabold text-neon-foreground shadow-[0_14px_30px_-15px_var(--color-neon)] transition active:scale-[0.98]"
            >
              {isRecovery ? (
                <HeartPulse className="size-4" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
              {isRecovery ? "Start recovery" : completed ? "Train again" : "Start workout"}
            </Link>
            <Link
              to="/workouts"
              aria-label="Choose another workout"
              className="grid h-12 min-h-[44px] w-12 min-w-[44px] place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition active:scale-95"
            >
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1.5 backdrop-blur-sm [&_svg]:size-3 [&_svg]:text-neon">
      {icon}
      {label}
    </span>
  );
}

function NutritionSnapshot({
  consumed,
  remaining,
  calorieGoal,
  protein,
  proteinGoal,
  itemCount,
}: {
  consumed: number;
  remaining: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  itemCount: number;
}) {
  const calorieProgress = percent(consumed, calorieGoal);
  const proteinProgress = percent(protein, proteinGoal);

  return (
    <Link
      data-tour="tour-nutrition-card"
      to="/nutrition"
      className="group relative min-h-[172px] overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface p-3.5 transition active:scale-[0.99] sm:min-h-[190px] sm:rounded-[25px] sm:p-4"
    >
      <div className="absolute right-[-34px] top-[-36px] size-28 rounded-full bg-neon/[0.07] blur-2xl" />
      <div className="relative flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-neon/10 text-neon">
          <Apple className="size-[18px]" />
        </span>
        <ChevronRight className="size-4 text-muted-foreground transition group-active:translate-x-0.5" />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Nutrition
      </p>
      <div className="mt-1 flex items-end gap-1">
        <strong className="text-[24px] font-extrabold leading-none tabular-nums">
          {remaining}
        </strong>
        <span className="pb-0.5 text-[10px] text-muted-foreground">kcal left</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-neon transition-all"
          style={{ width: `${calorieProgress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>{itemCount ? `${itemCount} logged` : "Log first meal"}</span>
        <span className="tabular-nums">
          {consumed}/{calorieGoal}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[10px]">
        <span className="text-muted-foreground">Protein</span>
        <span className="font-semibold tabular-nums">
          {protein}/{proteinGoal}g <span className="text-neon">· {proteinProgress}%</span>
        </span>
      </div>
    </Link>
  );
}

function ActivitySnapshot({
  completed,
  target,
  minutes,
  minuteTarget,
  streak,
}: {
  completed: number;
  target: number;
  minutes: number;
  minuteTarget: number;
  streak: number;
}) {
  const targetDays = Math.max(1, target);

  return (
    <Link
      data-tour="tour-progress-card"
      to="/progress"
      className="group relative min-h-[172px] overflow-hidden rounded-[22px] border border-white/[0.06] bg-surface p-3.5 transition active:scale-[0.99] sm:min-h-[190px] sm:rounded-[25px] sm:p-4"
    >
      <div className="absolute right-[-32px] top-[-34px] size-28 rounded-full bg-sky-400/[0.06] blur-2xl" />
      <div className="relative flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-white/[0.05] text-neon">
          <Dumbbell className="size-[18px]" />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-neon/10 px-2 py-1 text-[9px] font-bold text-neon">
          <Trophy className="size-3" /> {streak}d
        </span>
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Training
      </p>
      <div className="mt-1 flex items-end gap-1">
        <strong className="text-[24px] font-extrabold leading-none tabular-nums">
          {completed}
        </strong>
        <span className="pb-0.5 text-[10px] text-muted-foreground">of {targetDays} this week</span>
      </div>
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: targetDays }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < completed ? "bg-neon" : "bg-white/[0.07]",
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
        <span>
          {completed >= targetDays ? "Weekly goal hit" : `${targetDays - completed} to go`}
        </span>
        <span>{streak ? `${streak} day streak` : "Start your streak"}</span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-[10px]">
        <span className="text-muted-foreground">Today</span>
        <span className="font-semibold tabular-nums">
          {minutes}/{minuteTarget} min
        </span>
      </div>
    </Link>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: "/nutrition" | "/coach" | "/scan" | "/workouts";
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link to={to} className="group min-w-0 text-center active:scale-95">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/[0.06] bg-surface text-white shadow-[0_12px_25px_-18px_oklch(0_0_0/0.9)] transition group-active:border-neon/30 group-active:text-neon [&_svg]:size-[19px]">
        {icon}
      </span>
      <span className="mt-2 block truncate text-[9px] font-semibold text-muted-foreground">
        {label}
      </span>
    </Link>
  );
}

function WeekRail({ schedule }: { schedule: WeeklyScheduleDay[] }) {
  return (
    <div className="rounded-[25px] border border-white/[0.06] bg-surface p-3.5">
      <ol className="grid grid-cols-7 gap-1.5">
        {schedule.map((day) => {
          const content = (
            <>
              <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                {day.dayName.slice(0, 1)}
              </span>
              <span className="mt-1 text-[12px] font-bold tabular-nums">
                {new Date(`${day.dateISO}T12:00:00`).getDate()}
              </span>
              <span
                className={cn(
                  "mt-1.5 grid size-3 place-items-center rounded-full",
                  day.isCompleted
                    ? "bg-neon text-neon-foreground"
                    : day.isRestDay
                      ? "border border-white/15 bg-transparent"
                      : day.isToday
                        ? "bg-neon"
                        : "bg-white/15",
                )}
              >
                {day.isCompleted && <Check className="size-2.5" strokeWidth={3} />}
              </span>
            </>
          );
          const classes = cn(
            "flex min-h-[69px] flex-col items-center justify-center rounded-2xl border transition",
            day.isToday
              ? "border-neon/40 bg-neon/[0.08] text-white"
              : "border-transparent bg-white/[0.025] text-white/80",
          );

          return (
            <li key={day.id}>
              {day.workoutId ? (
                <Link to="/workout/$id" params={{ id: day.workoutId }} className={classes}>
                  {content}
                </Link>
              ) : (
                <div className={classes}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] px-1 pt-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold">
            {schedule.find((day) => day.isToday)?.splitLabel ?? "Today"}
          </p>
          <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
            {schedule.filter((day) => day.isCompleted).length} complete ·{" "}
            {schedule.filter((day) => !day.isRestDay).length} planned
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-neon">
          <Target className="size-3" /> Stay consistent
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
  linkTo,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  linkTo?: "/progress" | "/workouts";
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 px-1">
      <div>
        {eyebrow && (
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">{eyebrow}</p>
        )}
        <h2 className="mt-0.5 text-[18px] font-extrabold tracking-[-0.02em]">{title}</h2>
      </div>
      {action && linkTo && (
        <Link to={linkTo} className="mb-0.5 text-[10px] font-semibold text-muted-foreground">
          {action}
        </Link>
      )}
    </div>
  );
}

function getDisplayName(name?: string) {
  const firstName = name?.trim().split(/\s+/)[0] || "Athlete";
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

function percent(value: number, goal: number) {
  return goal ? Math.min(100, Math.max(0, Math.round((value / goal) * 100))) : 0;
}

function getAdaptiveTrainingInsight(
  completedWorkouts: CompletedWorkout[],
  todayWorkout: Workout | null,
  alternatives: Workout[],
): AdaptiveTrainingInsight | null {
  if (!todayWorkout || completedWorkouts.length === 0) return null;

  const recent = [...completedWorkouts]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .find((workout) => {
      const completedAt = new Date(workout.completedAt).getTime();
      const age = Date.now() - completedAt;
      return Number.isFinite(completedAt) && age >= 0 && age <= 48 * 60 * 60 * 1000;
    });

  if (!recent) return null;

  const recentAreas = new Set(
    recent.exercises
      .map((exercise) => focusAreaFromMuscleGroup(exercise.muscleGroup))
      .filter((area): area is FocusArea => Boolean(area)),
  );
  const overlap = todayWorkout.targetMuscles.filter(
    (area) => BODY_FOCUS_AREAS.has(area) && recentAreas.has(area),
  );

  if (overlap.length === 0) return null;

  const alternative = alternatives.find(
    (workout) =>
      workout.targetMuscles.some((area) => BODY_FOCUS_AREAS.has(area)) &&
      workout.targetMuscles.every((area) => !overlap.includes(area)),
  );
  if (!alternative) return null;

  return {
    overlap: [...new Set(overlap)],
    alternative,
    hoursSince: Math.max(
      0,
      Math.round((Date.now() - new Date(recent.completedAt).getTime()) / (60 * 60 * 1000)),
    ),
  };
}

const BODY_FOCUS_AREAS = new Set<FocusArea>(["chest", "back", "legs", "glutes", "arms", "core"]);

function focusAreaFromMuscleGroup(value: string): FocusArea | null {
  const muscle = value.toLowerCase();
  if (muscle.includes("chest") || muscle.includes("pec")) return "chest";
  if (muscle.includes("back") || muscle.includes("lat") || muscle.includes("trap")) {
    return "back";
  }
  if (muscle.includes("glute")) return "glutes";
  if (
    muscle.includes("quad") ||
    muscle.includes("hamstring") ||
    muscle.includes("calf") ||
    muscle.includes("leg")
  ) {
    return "legs";
  }
  if (
    muscle.includes("arm") ||
    muscle.includes("bicep") ||
    muscle.includes("tricep") ||
    muscle.includes("shoulder") ||
    muscle.includes("delt") ||
    muscle.includes("forearm")
  ) {
    return "arms";
  }
  if (muscle.includes("core") || muscle.includes("ab") || muscle.includes("oblique")) {
    return "core";
  }
  return null;
}

function formatAreaList(areas: FocusArea[]) {
  const labels = areas.map((area) => FOCUS_LABELS[area].toLowerCase());
  if (labels.length <= 1) return labels[0] ?? "those muscles";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}
