import { Link } from "@tanstack/react-router";
import { CalendarDays, Check, ChevronRight, Flame, HeartPulse, Play, Timer } from "lucide-react";
import { useMemo } from "react";
import {
  AnatomyFigure,
  AnatomyPair,
  regionsForMuscleLabel,
  workoutFills,
  type AnatomyFills,
} from "@/components/app/AnatomyFigure";
import {
  cardClass,
  DayStrip,
  DifficultyBadge,
  primaryButtonClass,
  AscentSteps,
  HeroCard,
  Kicker,
  SectionHeader,
  type DayStripItem,
} from "@/components/app/kit";
import { FOCUS_LABELS, useProfile, type FocusArea } from "@/lib/profile";
import { useProgress } from "@/lib/progressStore";
import { weeklyScheduleService, type WeeklyScheduleDay } from "@/lib/weeklySchedule";
import { getActiveWorkoutPlan, useSavedWorkoutPlans } from "@/lib/workoutPlanStore";
import { getWorkout, type Exercise, type Workout } from "@/lib/workouts";
import { personalizeWorkout } from "@/lib/workoutPersonalization";
import { useActiveSession, useCompletedWorkouts } from "@/lib/workoutSessionStore";
import { cn } from "@/lib/utils";

const BODY_AREAS = new Set<FocusArea>(["chest", "back", "legs", "glutes", "arms", "core"]);

export function focusTitle(workout: Workout | null | undefined, fallback?: string) {
  const areas = (workout?.targetMuscles ?? []).filter((area) => BODY_AREAS.has(area));
  if (areas.length === 0) return fallback ?? workout?.title ?? "Recovery";
  return areas
    .slice(0, 2)
    .map((area) => FOCUS_LABELS[area])
    .join(" & ");
}

function sameLocalDay(iso: string, date: Date) {
  return new Date(iso).toDateString() === date.toDateString();
}

export function dayStripState(day: WeeklyScheduleDay): DayStripItem["state"] {
  if (day.isToday) return day.isCompleted ? "todayDone" : "today";
  if (day.isCompleted) return "done";
  if (day.isRestDay) return "rest";
  const past = new Date(`${day.dateISO}T23:59:59`).getTime() < Date.now();
  return past ? "missed" : "planned";
}

export function scheduleToStrip(schedule: WeeklyScheduleDay[]): DayStripItem[] {
  return schedule.map((day) => ({
    key: day.id,
    letter: day.dayName.slice(0, 1),
    date: new Date(`${day.dateISO}T12:00:00`).getDate(),
    state: dayStripState(day),
  }));
}

/** Everything the "today" surfaces need: schedule, today's session and its progress. */
export function useTodayTraining() {
  const { profile } = useProfile();
  const savedPlans = useSavedWorkoutPlans();
  const completed = useCompletedWorkouts();
  const session = useActiveSession();
  const progress = useProgress(profile?.sessionMinutes ?? 30);
  const activePlan = useMemo(
    () => getActiveWorkoutPlan(savedPlans, profile),
    [savedPlans, profile],
  );
  const schedule = useMemo(
    () => (profile ? weeklyScheduleService.generateSchedule(profile, activePlan ?? []) : []),
    [profile, activePlan],
  );
  const todayPlan = schedule.find((day) => day.isToday);
  const isRestDay = !todayPlan || todayPlan.isRestDay || !todayPlan.workoutId;
  const workoutId = !isRestDay ? todayPlan?.workoutId : undefined;
  const workout = useMemo(() => {
    const base = workoutId ? getWorkout(workoutId) : undefined;
    return base ? personalizeWorkout(base, profile) : null;
  }, [profile, workoutId]);

  const nextPlan = useMemo(() => {
    if (!profile || !todayPlan) return undefined;
    const upcoming = (days: WeeklyScheduleDay[]) =>
      days.find((day) => day.dateISO > todayPlan.dateISO && !day.isRestDay && day.workoutId);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return (
      upcoming(schedule) ??
      upcoming(weeklyScheduleService.generateSchedule(profile, activePlan ?? [], nextWeek))
    );
  }, [activePlan, profile, schedule, todayPlan]);
  const nextWorkout = useMemo(() => {
    const base = nextPlan?.workoutId ? getWorkout(nextPlan.workoutId) : undefined;
    return base ? personalizeWorkout(base, profile) : null;
  }, [nextPlan?.workoutId, profile]);

  const today = new Date();
  const finishedToday = Boolean(
    workout &&
    (todayPlan?.isCompleted ||
      completed.some(
        (entry) => entry.workoutId === workout.id && sameLocalDay(entry.completedAt, today),
      )),
  );
  const liveSession =
    workout && session?.status === "active" && session.workoutId === workout.id ? session : null;
  const doneExerciseIds = new Set<string>(
    finishedToday
      ? (workout?.exercises.map((exercise) => exercise.id) ?? [])
      : (liveSession?.exercises
          .filter((log) => log.sets.length > 0 && log.sets.every((set) => set.completed))
          .map((log) => log.exerciseId) ?? []),
  );
  const total = workout?.exercises.length ?? 0;
  const trainingDays = schedule.filter((day) => !day.isRestDay).length;
  const completedDays = schedule.filter((day) => day.isCompleted && !day.isRestDay).length;

  return {
    profile,
    schedule,
    todayPlan,
    isRestDay,
    workout,
    nextPlan,
    nextWorkout,
    finishedToday,
    liveSession,
    doneExerciseIds,
    doneCount: Math.min(total, doneExerciseIds.size),
    total,
    streak: progress.streakDays,
    trainingDays,
    completedDays,
  };
}

export type TodayTraining = ReturnType<typeof useTodayTraining>;

export function TodayFocusCard({
  training,
  className,
}: {
  training: TodayTraining;
  className?: string;
}) {
  const {
    workout,
    isRestDay,
    nextWorkout,
    nextPlan,
    schedule,
    doneCount,
    total,
    streak,
    todayPlan,
  } = training;
  const featured = workout ?? nextWorkout;
  const fills = useMemo<AnatomyFills>(
    () =>
      featured
        ? workoutFills(
            featured.targetMuscles,
            featured.exercises.map((exercise) => exercise.muscleGroup),
          )
        : {},
    [featured],
  );
  const title = isRestDay ? "Recovery day" : focusTitle(workout, todayPlan?.splitLabel);
  const duration = isRestDay
    ? (nextPlan?.duration ?? 0)
    : (todayPlan?.duration ?? workout?.duration ?? 0);
  const chips = (featured?.exercises ?? []).slice(0, 3);

  return (
    <HeroCard className={cn("p-5", className)} data-tour="tour-today-workout">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Kicker accent>{isRestDay ? "Rest day" : "Today's focus"}</Kicker>
          <h2 className="mt-2 text-[26px] font-bold leading-[1.08] tracking-[-0.03em]">{title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="font-data inline-flex items-center gap-1.5 rounded-[8px] bg-white/[0.06] px-2 py-1 text-[11px] font-semibold uppercase">
              {isRestDay ? (
                <>
                  <HeartPulse className="size-3.5" /> Recover
                </>
              ) : (
                <>
                  <Timer className="size-3.5" /> {duration} min
                </>
              )}
            </span>
            <span
              className={cn(
                "font-data inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11px] font-semibold uppercase",
                streak > 0 ? "bg-neon/12 text-neon" : "bg-white/[0.06]",
              )}
            >
              <Flame className="size-3.5" />
              {streak > 0 ? `${streak}d streak` : "Day 1"}
            </span>
          </div>
        </div>
        {!isRestDay && total > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
            <AscentSteps done={doneCount} total={total} height={56} />
            <span className="font-data text-[11px] font-semibold uppercase text-muted-foreground">
              <span className="text-foreground">{doneCount}</span>/{total} moves
            </span>
          </div>
        )}
      </div>

      <AnatomyPair
        fills={fills}
        className="mx-auto mt-5 max-w-[300px]"
        figureClassName="max-h-[200px]"
        label={featured ? `Muscles worked: ${featured.targetMuscles.join(", ")}` : undefined}
      />
      <div className="font-data mt-3 flex items-center justify-center gap-4 text-[11px] font-semibold uppercase text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-neon" /> Primary
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-[repeating-linear-gradient(45deg,var(--color-neon)_0_1.5px,transparent_1.5px_4px)] ring-1 ring-neon/50" />
          Support
        </span>
      </div>

      {schedule.length > 0 && (
        <div className="mt-5 border-t border-dashed border-white/10 pt-4">
          <DayStrip
            days={scheduleToStrip(schedule)}
            renderDay={(day, column) => {
              const scheduleDay = schedule.find((item) => item.id === day.key);
              return scheduleDay?.workoutId ? (
                <Link
                  to="/workout/$id"
                  params={{ id: scheduleDay.workoutId }}
                  aria-label={`${scheduleDay.dayName}: ${scheduleDay.workoutTitle}`}
                  className="w-full"
                >
                  {column}
                </Link>
              ) : (
                column
              );
            }}
          />
        </div>
      )}
    </HeroCard>
  );
}

export function TodayStartButton({ training }: { training: TodayTraining }) {
  const { workout, isRestDay, nextWorkout, liveSession, finishedToday } = training;
  if (isRestDay) {
    return (
      <div className="grid grid-cols-[1fr_auto] gap-2.5">
        <Link to="/workout/$id" params={{ id: "mobility-recovery" }} className={primaryButtonClass}>
          <HeartPulse /> Start recovery
        </Link>
        {nextWorkout && (
          <Link
            to="/workout/$id"
            params={{ id: nextWorkout.id }}
            aria-label={`Preview ${nextWorkout.title}`}
            className="grid size-14 place-items-center rounded-[18px] border border-hairline bg-surface"
          >
            <CalendarDays className="size-5" />
          </Link>
        )}
      </div>
    );
  }
  if (!workout) return null;
  return (
    <Link to="/workout/$id/session" params={{ id: workout.id }} className={primaryButtonClass}>
      <Play className="fill-current" />
      {liveSession ? "Continue workout" : finishedToday ? "Train again" : "Start workout"}
    </Link>
  );
}

export function ExerciseThumb({ exercise, done }: { exercise: Exercise; done?: boolean }) {
  const regions = regionsForMuscleLabel(exercise.muscleGroup);
  const fills: AnatomyFills = Object.fromEntries(
    regions.map((region) => [region, "var(--color-neon)"]),
  );
  const backHeavy = regions.some((region) =>
    ["lats", "lowerBack", "glutes", "hamstrings", "triceps"].includes(region),
  );
  return (
    <span className="relative grid size-[60px] place-items-center overflow-hidden rounded-[16px] bg-white/[0.05]">
      <AnatomyFigure
        side={backHeavy && !regions.includes("chest") ? "back" : "front"}
        fills={fills}
        glow={false}
        pedestal={false}
        className="h-[52px] w-auto"
      />
      {done && (
        <span className="absolute inset-0 grid place-items-center bg-black/55">
          <span className="grid size-7 place-items-center rounded-full bg-neon text-neon-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
        </span>
      )}
    </span>
  );
}

function prescription(exercise: Exercise) {
  const volume = exercise.reps
    ? `${exercise.sets} × ${exercise.reps}`
    : `${exercise.sets} × ${exercise.time}`;
  return `${volume} · ${exercise.rest} rest`;
}

export function TodayExerciseList({ training }: { training: TodayTraining }) {
  const { workout, doneExerciseIds, doneCount, total, nextPlan, nextWorkout } = training;
  return (
    <>
      {workout && total > 0 && (
        <section className="mt-7">
          <SectionHeader title={`Today's ${total}`} meta={`${doneCount}/${total} done`} />
          <ol className="space-y-2.5">
            {workout.exercises.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  to="/workout/$id/demo/$exerciseId"
                  params={{ id: workout.id, exerciseId: exercise.id }}
                  className={cn(
                    cardClass,
                    "flex items-center gap-3.5 rounded-[20px] p-3 transition active:scale-[0.99]",
                  )}
                >
                  <ExerciseThumb exercise={exercise} done={doneExerciseIds.has(exercise.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold">{exercise.name}</p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-neon">
                      {prescription(exercise)}
                    </p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-2">
                      <DifficultyBadge level={exercise.difficulty} />
                      <span className="truncate text-[12px] text-muted-foreground">
                        {exercise.muscleGroup}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {nextPlan && nextWorkout && (
        <Link
          to="/workout/$id"
          params={{ id: nextWorkout.id }}
          className={cn(
            cardClass,
            "mt-3 flex items-center gap-3.5 rounded-[20px] p-3.5 active:scale-[0.99]",
          )}
        >
          <span className="grid size-12 place-items-center rounded-[14px] bg-white/[0.06]">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="kicker text-[11px]">{upcomingLabel(nextPlan.dateISO)}</p>
            <p className="mt-0.5 truncate text-[16px] font-bold">
              {focusTitle(nextWorkout, nextWorkout.title)}
            </p>
          </div>
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {nextPlan.duration} min
          </span>
        </Link>
      )}
    </>
  );
}

function upcomingLabel(dateISO: string) {
  const date = new Date(`${dateISO}T12:00:00`);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString()
    ? "Tomorrow"
    : date.toLocaleDateString(undefined, { weekday: "long" });
}
