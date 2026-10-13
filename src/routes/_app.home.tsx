import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  MessageSquare,
  Play,
  RefreshCw,
  ScanFace,
  ScanLine,
  Timer,
  UserRound,
  Utensils,
} from "lucide-react";
import { FOCUS_LABELS, useProfile, type FocusArea } from "@/lib/profile";
import { workoutRecommendationService, type Workout } from "@/lib/workouts";
import { WorkoutCardHero } from "@/components/WorkoutCard";
import { useNutrition } from "@/lib/nutritionStore";
import { WeeklyReportCard } from "@/components/weekly/WeeklyReportCard";
import { QuickLogFab } from "@/components/weekly/QuickLogFab";
import { listNotifications } from "@/lib/weeklyReport.functions";
import { cn } from "@/lib/utils";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import { useCompletedWorkouts, type CompletedWorkout } from "@/lib/workoutSessionStore";
import { AnatomyFigure, workoutFills } from "@/components/app/AnatomyFigure";
import {
  AscentSteps,
  cardClass,
  DayStrip,
  HeroCard,
  Kicker,
  DeltaBadge,
  iconButtonClass,
  MACRO_COLORS,
  Page,
  PageHeader,
  ProgressRing,
  scoreColor,
  SectionHeader,
  StackedBar,
} from "@/components/app/kit";
import { TrendChart } from "@/components/app/charts";
import {
  focusTitle,
  scheduleToStrip,
  useTodayTraining,
  type TodayTraining,
} from "@/components/workouts/TodayFocus";
import { scanTrendPoints, useScanHistory } from "@/components/scans/useScanHistory";
import type { ScanSubmissionSummary } from "@/lib/scanSubmissions.functions";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — Ascendr" }] }),
  component: HomePage,
});

function HomePage() {
  const { profile } = useProfile();
  const session = useAuthSession();
  const signedIn = isAccountSession(session);
  const displayName =
    profile?.name?.trim().toLowerCase() === "sahil" ? "Admin" : getDisplayName(profile?.name);
  const { totals, goals } = useNutrition();
  const training = useTodayTraining();
  const completedWorkouts = useCompletedWorkouts();
  const [dismissedRecoveryCheck, setDismissedRecoveryCheck] = useState(false);
  const bodyScans = useScanHistory("body");
  const faceScans = useScanHistory("face");

  const recommended = useMemo(
    () =>
      profile
        ? workoutRecommendationService
            .recommend(profile, 10)
            .filter((workout) => workout.id !== training.workout?.id)
            .slice(0, 5)
        : [],
    [profile, training.workout?.id],
  );
  const adaptiveInsight = useMemo(
    () => getAdaptiveTrainingInsight(completedWorkouts, training.workout, recommended),
    [completedWorkouts, training.workout, recommended],
  );

  const listNotif = useServerFn(listNotifications);
  const { data: notifs } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotif(),
    enabled: signedIn,
    staleTime: 60_000,
  });
  const unread = (notifs ?? []).filter((notification) => !notification.read_at).length;

  return (
    <Page className="pb-28">
      <div data-tour="tour-home-header">
        <PageHeader
          className="[&_h1]:text-[26px]"
          kicker={`${formatToday()} · ${getGreeting()}`}
          title={`Hi, ${displayName}`}
          actions={
            <>
              <Link
                to="/notifications"
                className={iconButtonClass}
                aria-label={unread ? `${unread} unread notifications` : "Notifications"}
              >
                <Bell />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-neon px-1 text-[10px] font-bold leading-5 text-neon-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link to="/profile" aria-label="Open profile" className={iconButtonClass}>
                <UserRound />
              </Link>
            </>
          }
        />
      </div>

      {adaptiveInsight && !dismissedRecoveryCheck && (
        <AdaptivePlanCard
          insight={adaptiveInsight}
          onKeepPlan={() => setDismissedRecoveryCheck(true)}
        />
      )}

      {profile && <TodayCard training={training} />}

      <section className="mt-7">
        <SectionHeader
          title="Fuel"
          meta={
            <Link to="/nutrition" className="inline-flex items-center gap-0.5">
              Log food <ChevronRight className="size-4" />
            </Link>
          }
        />
        <Link
          to="/nutrition"
          data-tour="tour-nutrition-card"
          className={cn(cardClass, "block p-5 transition active:scale-[0.99]")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="kicker">Calories left</p>
              <p className="mt-1.5 text-[44px] font-bold leading-none tracking-[-0.04em] tabular-nums">
                {totals.remaining.toLocaleString()}
              </p>
              <p className="mt-2 truncate text-[14px] text-muted-foreground">
                {totals.kcal.toLocaleString()} eaten of {goals.kcal.toLocaleString()} kcal
              </p>
            </div>
            <ProgressRing value={goals.kcal ? totals.kcal / goals.kcal : 0} size={88} stroke={9}>
              <span className="text-[17px] font-bold tabular-nums">
                {percent(totals.kcal, goals.kcal)}%
              </span>
            </ProgressRing>
          </div>
          <StackedBar
            className="mt-5"
            max={goals.kcal}
            segments={[
              { label: "Protein", value: totals.protein * 4, color: MACRO_COLORS.protein },
              { label: "Carbs", value: totals.carbs * 4, color: MACRO_COLORS.carbs },
              { label: "Fat", value: totals.fat * 9, color: MACRO_COLORS.fat },
            ]}
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MacroStat
              label="Protein"
              value={totals.protein}
              goal={goals.protein}
              color={MACRO_COLORS.protein}
            />
            <MacroStat
              label="Carbs"
              value={totals.carbs}
              goal={goals.carbs}
              color={MACRO_COLORS.carbs}
            />
            <MacroStat label="Fat" value={totals.fat} goal={goals.fat} color={MACRO_COLORS.fat} />
          </div>
        </Link>
      </section>

      <section className="mt-7">
        <SectionHeader
          title="Your scores"
          meta={
            <Link to="/scan" className="inline-flex items-center gap-0.5">
              Scan <ChevronRight className="size-4" />
            </Link>
          }
        />
        <div data-tour="tour-progress-card">
          <ScoresCard body={bodyScans.data} face={faceScans.data} />
        </div>
      </section>

      <section className="mt-7">
        <div className="grid grid-cols-4 gap-2.5">
          <QuickAction to="/nutrition" icon={<Utensils />} label="Log meal" />
          <QuickAction to="/scan/body" icon={<ScanLine />} label="Body scan" />
          <QuickAction to="/scan/face" icon={<ScanFace />} label="Face scan" />
          <QuickAction to="/coach" icon={<MessageSquare />} label="Coach" />
        </div>
      </section>

      <section className="mt-7">
        <WeeklyReportCard compact />
      </section>

      {recommended.length > 0 && (
        <section className="mt-7">
          <SectionHeader
            title="Picked for you"
            meta={
              <Link to="/workouts" className="inline-flex items-center gap-0.5">
                All <ChevronRight className="size-4" />
              </Link>
            }
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
    </Page>
  );
}

function TodayCard({ training }: { training: TodayTraining }) {
  const { workout, isRestDay, nextWorkout, todayPlan, doneCount, total, streak, schedule } =
    training;
  const featured = workout ?? nextWorkout;
  const fills = useMemo(
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

  return (
    <HeroCard data-tour="tour-today-workout" className="mt-5 overflow-hidden p-5">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <Kicker accent>{isRestDay ? "Rest day" : "Today's focus"}</Kicker>
          <h2 className="mt-2 text-[26px] font-bold leading-[1.08] tracking-[-0.03em]">{title}</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="font-data inline-flex items-center gap-1.5 rounded-[8px] bg-white/[0.06] px-2 py-1 text-[11px] font-semibold uppercase">
              {isRestDay ? (
                <>
                  <HeartPulse className="size-3.5" /> Recover
                </>
              ) : (
                <>
                  <Timer className="size-3.5" /> {todayPlan?.duration ?? workout?.duration} min
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
          {!isRestDay && total > 0 && (
            <div className="mt-5 flex items-end gap-3">
              <AscentSteps done={doneCount} total={total} height={46} />
              <span className="font-data pb-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <span className="text-[15px] text-foreground">{doneCount}</span>/{total}
                <br />
                moves
              </span>
            </div>
          )}
        </div>
        <div className="w-[108px] shrink-0">
          <AnatomyFigure side="front" fills={fills} className="max-h-[180px]" />
        </div>
      </div>

      {schedule.length > 0 && (
        <div className="mt-4 border-t border-dashed border-white/10 pt-4">
          <DayStrip days={scheduleToStrip(schedule)} />
        </div>
      )}

      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2.5">
        {isRestDay ? (
          <Link
            to="/workout/$id"
            params={{ id: "mobility-recovery" }}
            className="flex items-center justify-center gap-2 rounded-[16px] bg-neon py-3.5 text-[15px] font-bold text-neon-foreground active:scale-[0.98]"
          >
            <HeartPulse className="size-[18px]" /> Start recovery
          </Link>
        ) : workout ? (
          <Link
            to="/workout/$id/session"
            params={{ id: workout.id }}
            className="flex items-center justify-center gap-2 rounded-[16px] bg-neon py-3.5 text-[15px] font-bold text-neon-foreground active:scale-[0.98]"
          >
            <Play className="size-[18px] fill-current" />
            {training.liveSession
              ? "Continue"
              : training.finishedToday
                ? "Train again"
                : "Start workout"}
          </Link>
        ) : (
          <span />
        )}
        <Link
          to="/workouts"
          aria-label="Open training plan"
          className="grid w-[52px] place-items-center rounded-[16px] border border-hairline bg-white/[0.05]"
        >
          <Dumbbell className="size-5" />
        </Link>
      </div>
    </HeroCard>
  );
}

function MacroStat({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="mt-1 truncate text-[15px] font-bold tabular-nums">
        {value}
        <span className="text-[12px] font-medium text-muted-foreground">/{goal}g</span>
      </p>
    </div>
  );
}

function ScoresCard({
  body,
  face,
}: {
  body?: ScanSubmissionSummary[];
  face?: ScanSubmissionSummary[];
}) {
  const bodyTrend = scanTrendPoints(body);
  return (
    <div className={cn(cardClass, "p-5")}>
      <div className="grid grid-cols-2 gap-3">
        <ScoreTile kind="body" items={body} />
        <ScoreTile kind="face" items={face} />
      </div>
      {bodyTrend.length >= 2 && (
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="kicker text-[11px]">Physique trend</p>
          <TrendChart points={bodyTrend} height={120} className="mt-2" />
        </div>
      )}
    </div>
  );
}

function ScoreTile({ kind, items }: { kind: "body" | "face"; items?: ScanSubmissionSummary[] }) {
  const latest = items?.[0];
  const previous = items?.[1];
  const delta = latest && previous ? latest.overallScore - previous.overallScore : 0;
  const label = kind === "body" ? "Physique" : "Face";
  const content = (
    <>
      <ProgressRing
        value={latest ? latest.overallScore / 100 : 0}
        size={92}
        stroke={8}
        color={scoreColor(latest?.overallScore)}
      >
        <span className="flex flex-col items-center">
          <span
            className="text-[26px] font-bold leading-none tabular-nums"
            style={{ color: latest ? scoreColor(latest.overallScore) : undefined }}
          >
            {latest?.overallScore ?? "—"}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">/100</span>
        </span>
      </ProgressRing>
      <p className="mt-3 text-[15px] font-bold">{label}</p>
      <div className="mt-1 h-6">
        {latest ? (
          delta ? (
            <DeltaBadge value={delta} className="px-2 py-0.5" />
          ) : (
            <span className="text-[12px] text-muted-foreground">
              {new Date(latest.analyzedAt ?? latest.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )
        ) : (
          <span className="text-[12px] font-semibold text-neon">Get your score</span>
        )}
      </div>
    </>
  );
  const className =
    "flex flex-col items-center rounded-[20px] bg-white/[0.035] px-2 py-4 text-center transition active:scale-[0.98]";
  if (latest) {
    return kind === "body" ? (
      <Link to="/scan/body/$id" params={{ id: latest.id }} className={className}>
        {content}
      </Link>
    ) : (
      <Link to="/scan/face/$id" params={{ id: latest.id }} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <Link to={kind === "body" ? "/scan/body" : "/scan/face"} className={className}>
      {content}
    </Link>
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
    <div className={cn(cardClass, "mt-5 border-neon/25 p-4")}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-neon/12 text-neon">
          <RefreshCw className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold leading-tight">Rest your {muscleList}?</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Trained {timing}.</p>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-[1fr_auto] gap-2">
        <Link
          to="/workout/$id"
          params={{ id: insight.alternative.id }}
          className="flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[14px] bg-neon px-4 text-[14px] font-bold text-neon-foreground transition active:scale-[0.98]"
        >
          <span className="truncate">
            Switch to{" "}
            {insight.alternative.targetMuscles[0]
              ? FOCUS_LABELS[insight.alternative.targetMuscles[0]]
              : "another focus"}
          </span>
          <ChevronRight className="size-4 shrink-0" />
        </Link>
        <button
          type="button"
          onClick={onKeepPlan}
          className="h-11 rounded-[14px] border border-hairline bg-white/[0.05] px-4 text-[14px] font-semibold"
        >
          Keep plan
        </button>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: "/nutrition" | "/coach" | "/scan/body" | "/scan/face";
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link to={to} className="group min-w-0 text-center active:scale-95">
      <span className="mx-auto grid size-[58px] place-items-center rounded-[18px] border border-hairline bg-surface text-foreground transition group-active:text-neon [&_svg]:size-[22px]">
        {icon}
      </span>
      <span className="mt-2 block truncate text-[12px] font-semibold text-muted-foreground">
        {label}
      </span>
    </Link>
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
