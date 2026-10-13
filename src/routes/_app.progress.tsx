import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Dumbbell, Flame, History, ScanLine, Timer, Trophy, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useCompletedWorkouts, computePRs } from "@/lib/workoutSessionStore";
import { useProgress, useWorkoutLog } from "@/lib/progressStore";
import { GoalPanel } from "@/components/GoalPanel";
import { ProgressPicturesCard } from "@/components/photos/ProgressPicturesCard";
import { WeeklyReportCard } from "@/components/weekly/WeeklyReportCard";
import {
  computeMuscleInsights,
  type CanonicalMuscle,
  type MuscleInsight,
  type MuscleScanMetric,
} from "@/lib/muscleAnalytics";
import { useProfile } from "@/lib/profile";
import { getScanSubmission } from "@/lib/scanSubmissions.functions";
import { parseBodyScanResult, type BodyScanAiResult } from "@/lib/bodyScan.functions";
import { cn } from "@/lib/utils";
import {
  AnatomyPair,
  regionsForCanonical,
  type AnatomyFills,
} from "@/components/app/AnatomyFigure";
import { BeforeAfter } from "@/components/app/BeforeAfter";
import { TrendChart } from "@/components/app/charts";
import {
  cardClass,
  EmptyState,
  iconButtonClass,
  Page,
  PageHeader,
  primaryButtonClass,
  ScoreGrid,
  scoreColor,
  SectionHeader,
} from "@/components/app/kit";
import { bodyBreakdown } from "@/components/scans/BodyScanReport";
import { scanTrendPoints, useScanHistory } from "@/components/scans/useScanHistory";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({ meta: [{ title: "Progress — Ascendr" }] }),
  component: ProgressPage,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function useBodyScanDetail(id: string | undefined) {
  const getScan = useServerFn(getScanSubmission);
  return useQuery({
    queryKey: ["scan-submission", "body", id],
    queryFn: () => getScan({ data: { id: id as string, scanType: "body" } }),
    enabled: Boolean(id),
    staleTime: 60_000,
    retry: false,
  });
}

function ProgressPage() {
  const { profile } = useProfile();
  const history = useCompletedWorkouts();
  const log = useWorkoutLog();
  const progress = useProgress();
  const prs = useMemo(() => computePRs(history), [history]);
  const scans = useScanHistory("body");
  const scanList = scans.data ?? [];
  const latest = scanList[0];
  const first = scanList.length > 1 ? scanList[scanList.length - 1] : undefined;
  const latestDetail = useBodyScanDetail(latest?.id);
  const firstDetail = useBodyScanDetail(first?.id);
  const scanResult = useMemo(
    () => (latestDetail.data ? parseBodyScanResult(latestDetail.data.analysis) : null),
    [latestDetail.data],
  );
  const firstResult = useMemo(
    () => (firstDetail.data ? parseBodyScanResult(firstDetail.data.analysis) : null),
    [firstDetail.data],
  );
  const muscleInsights = useMemo(
    () =>
      computeMuscleInsights({
        history,
        experience: profile?.experience,
        focusAreas: profile?.focusAreas,
        scanScores: scanResult ? bodyScanMetrics(scanResult) : undefined,
      }),
    [history, profile?.experience, profile?.focusAreas, scanResult],
  );
  const scanLoading = scans.isLoading || latestDetail.isLoading;

  const week = useMemo(() => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - day);
    const minutes = Array(7).fill(0);
    for (const l of log) {
      const d = new Date(l.date);
      const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) minutes[diff] += l.minutes;
    }
    const max = Math.max(60, ...minutes);
    return DAY_LABELS.map((d, i) => ({
      d,
      v: (minutes[i] / max) * 100,
      m: minutes[i],
      today: i === day,
    }));
  }, [log]);

  const weeklyCalories = history
    .filter((w) => {
      const now = new Date();
      const day = (now.getDay() + 6) % 7;
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - day);
      return new Date(w.completedAt).getTime() >= monday.getTime();
    })
    .reduce((s, w) => s + w.calories, 0);

  const trainedMin = log.reduce((s, l) => s + l.minutes, 0);
  const trainedH = Math.floor(trainedMin / 60);
  const trainedM = trainedMin % 60;
  const weeklyMinutes = week.reduce((sum, day) => sum + day.m, 0);

  const prEntries = Object.entries(prs.maxWeightByExercise)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);
  const e1rmEntries = Object.entries(prs.best1RMByExercise)
    .sort((a, b) => b[1].e1rm - a[1].e1rm)
    .slice(0, 3);

  const breakdown = scanResult ? bodyBreakdown(scanResult) : null;
  const baseline = firstResult ? bodyBreakdown(firstResult) : null;
  const muscleProgress = breakdown?.map((item, index) => ({
    label: item.label,
    score: item.score,
    delta:
      baseline && item.score != null && baseline[index]?.score != null
        ? item.score - (baseline[index].score as number)
        : null,
  }));
  const trend = scanTrendPoints(scanList);

  return (
    <Page className="pb-28">
      <PageHeader
        kicker={
          latest
            ? `${scanList.length} body scan${scanList.length === 1 ? "" : "s"}`
            : "Your journey"
        }
        title="Progress"
        actions={
          <>
            <Link to="/workout/history" aria-label="Workout history" className={iconButtonClass}>
              <History />
            </Link>
            <Link to="/profile" aria-label="Open profile" className={iconButtonClass}>
              <UserRound />
            </Link>
          </>
        }
      />

      <SectionHeader className="mt-6" title="Transformation" />
      {latest?.photoUrl && first?.photoUrl ? (
        <BeforeAfter
          before={first.photoUrl}
          after={latest.photoUrl}
          beforeLabel={shortDate(first.analyzedAt ?? first.createdAt)}
          afterLabel={shortDate(latest.analyzedAt ?? latest.createdAt)}
        />
      ) : latest?.photoUrl ? (
        <div className={cn(cardClass, "p-3")}>
          <div className="grid grid-cols-2 gap-2">
            <figure className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-black">
              <img
                src={latest.photoUrl}
                alt="Baseline Body Scan"
                className="absolute inset-0 size-full object-cover object-top"
              />
              <figcaption className="font-data absolute left-2 top-2 rounded-[8px] bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase backdrop-blur-md">
                Before · {shortDate(latest.analyzedAt ?? latest.createdAt)}
              </figcaption>
            </figure>
            <Link
              to="/scan/body/new"
              search={{ pending: undefined }}
              className="flex aspect-[3/4] flex-col items-center justify-center rounded-[18px] border border-dashed border-white/15 bg-white/[0.02] px-3 text-center transition active:scale-[0.98]"
            >
              <span className="grid size-11 place-items-center rounded-full bg-neon/12 text-neon">
                <ScanLine className="size-5" />
              </span>
              <span className="mt-3 text-[15px] font-bold">After</span>
              <span className="mt-1 text-[12px] leading-snug text-muted-foreground">
                Your next scan appears here
              </span>
            </Link>
          </div>
          <p className="mt-3 px-1 text-[13px] text-muted-foreground">
            Rescan in 2–4 weeks with the same pose and light for a fair comparison.
          </p>
        </div>
      ) : (
        <EmptyState
          icon={<ScanLine />}
          title={scanLoading ? "Loading your scans…" : "Start your transformation"}
          detail="Your first Body Scan sets the baseline every later scan is compared with."
          action={
            !scanLoading && (
              <Link to="/scan/body" className={primaryButtonClass}>
                <ScanLine /> Take a Body Scan
              </Link>
            )
          }
        />
      )}

      {muscleProgress && (
        <section className="mt-7">
          <SectionHeader
            title={first ? "Muscle progress" : "Muscle scores"}
            meta={
              first
                ? `vs. ${shortDate(first.analyzedAt ?? first.createdAt)}`
                : latest
                  ? `Baseline · ${shortDate(latest.analyzedAt ?? latest.createdAt)}`
                  : "Baseline"
            }
          />
          <ScoreGrid items={muscleProgress} />
        </section>
      )}

      {trend.length >= 2 && (
        <section className="mt-7">
          <SectionHeader title="Physique score" meta={`${trend.length} scans`} />
          <div className={cn(cardClass, "px-3 pb-3 pt-4")}>
            <TrendChart points={trend} />
          </div>
        </section>
      )}

      <MuscleIntelligence
        insights={muscleInsights}
        hasScan={Boolean(scanResult)}
        hasTraining={muscleInsights.some((insight) => insight.sets7d > 0)}
      />

      <section className="mt-7">
        <SectionHeader
          title="Training"
          meta={
            <Link to="/workout/history" className="inline-flex items-center gap-1">
              History
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={Flame} label="Burned this week" value={`${weeklyCalories}`} unit="kcal" />
          <StatCard
            icon={Timer}
            label="Time trained"
            value={trainedH > 0 ? `${trainedH}h ${trainedM}m` : `${trainedM}m`}
          />
          <StatCard icon={Trophy} label="Day streak" value={`${progress.streakDays}`} />
          <StatCard icon={Dumbbell} label="Workouts" value={`${prs.totalWorkouts}`} />
        </div>

        <div className={cn(cardClass, "mt-2.5 p-5")}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="kicker">This week</p>
              <p className="mt-1 text-[28px] font-bold leading-none tabular-nums">
                {weeklyMinutes}
                <span className="ml-1 text-[14px] font-semibold text-muted-foreground">min</span>
              </p>
            </div>
            <Clock className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-5 flex h-36 items-end gap-2.5">
            {week.map((day) => (
              <div
                key={day.d}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {day.m > 0 ? day.m : ""}
                </span>
                <div
                  className={cn(
                    "w-full rounded-[8px] transition-all",
                    day.m > 0 ? "bg-neon" : "bg-white/[0.07]",
                  )}
                  style={{ height: `${Math.max(6, day.v)}%` }}
                />
                <span
                  className={cn(
                    "text-[12px] font-semibold",
                    day.today ? "text-neon" : "text-muted-foreground",
                  )}
                >
                  {day.d.slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-7">
        <WeeklyReportCard />
      </div>

      <div className="mt-4">
        <GoalPanel />
      </div>

      <div className="mt-4">
        <ProgressPicturesCard />
      </div>

      <section className={cn(cardClass, "mt-7 p-5")}>
        <h2 className="text-[18px] font-bold">Volume</h2>
        <div className="mt-2">
          <Record label="Total sets" value={`${prs.totalSets}`} />
          <Record label="Total reps" value={`${prs.totalReps}`} />
          <Record label="Total volume" value={`${prs.totalVolume.toLocaleString()}`} />
          <Record
            label="Best session"
            value={
              prs.bestVolumeWorkout
                ? `${prs.bestVolumeWorkout.volume.toLocaleString()} ${prs.bestVolumeWorkout.unit}`
                : "—"
            }
            last
          />
        </div>
      </section>

      <section className={cn(cardClass, "mt-3 p-5")}>
        <h2 className="text-[18px] font-bold">Personal records</h2>
        {prEntries.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted-foreground">
            Log a weighted workout to start tracking PRs.
          </p>
        ) : (
          <>
            <p className="kicker mt-4 text-[11px]">Heaviest sets</p>
            {prEntries.map(([name, pr], i) => (
              <Record
                key={name}
                label={name}
                value={`${pr.weight} ${pr.unit} × ${pr.reps}`}
                last={i === prEntries.length - 1}
              />
            ))}
            {e1rmEntries.length > 0 && (
              <>
                <p className="kicker mt-5 text-[11px]">Estimated 1RM</p>
                {e1rmEntries.map(([name, pr], i) => (
                  <Record
                    key={name}
                    label={name}
                    value={`${pr.e1rm} ${pr.unit}`}
                    last={i === e1rmEntries.length - 1}
                  />
                ))}
              </>
            )}
          </>
        )}
      </section>
    </Page>
  );
}

const RECOVERING = new Set<MuscleInsight["status"]>(["Recovering", "High load"]);

function MuscleIntelligence({
  insights,
  hasScan,
  hasTraining,
}: {
  insights: MuscleInsight[];
  hasScan: boolean;
  hasTraining: boolean;
}) {
  // With a scan but nothing logged this week, the physique view is the one with real
  // data. Scan data loads after first render, so the default follows it until the
  // member picks a tab themselves.
  const [picked, setPicked] = useState<"training" | "physique" | null>(null);
  const mode = picked ?? (!hasTraining && hasScan ? "physique" : "training");
  const setMode = setPicked;
  // Insights arrive sorted by priority: the first fresh muscles are what to train next.
  const trainNext = useMemo(
    () =>
      new Set(
        insights
          .filter((insight) => !RECOVERING.has(insight.status))
          .slice(0, 3)
          .map((insight) => insight.muscle),
      ),
    [insights],
  );
  const ranked = useMemo(
    () =>
      mode === "training"
        ? insights
        : [...insights].sort((a, b) => (b.scanScore ?? -1) - (a.scanScore ?? -1)),
    [insights, mode],
  );
  const fills = useMemo<AnatomyFills>(() => {
    const result: AnatomyFills = {};
    for (const insight of insights) {
      let fill: AnatomyFills[keyof AnatomyFills];
      if (mode === "training") {
        if (!hasTraining) continue;
        if (trainNext.has(insight.muscle)) fill = "var(--color-neon)";
        else if (RECOVERING.has(insight.status))
          fill = { color: "var(--color-analytics-violet)", hatch: true };
      } else if (insight.scanScore != null) {
        fill = scoreColor(insight.scanScore);
      }
      if (!fill) continue;
      for (const region of regionsForCanonical(insight.muscle)) result[region] = fill;
    }
    return result;
  }, [hasTraining, insights, mode, trainNext]);
  const legend =
    mode === "training"
      ? ([
          ["Train next", "var(--color-neon)"],
          ["Recovering", "var(--color-analytics-violet)"],
        ] as const)
      : ([
          ["Strong", "var(--color-score-high)"],
          ["Average", "var(--color-score-mid)"],
          ["Lagging", "var(--color-score-low)"],
        ] as const);

  return (
    <section className="mt-7">
      <SectionHeader title="Muscle map" />
      <div className={cn(cardClass, "p-5")}>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.05] p-1">
          {(["training", "physique"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "h-10 rounded-full text-[14px] font-semibold transition",
                mode === value ? "bg-white/[0.12] text-foreground" : "text-muted-foreground",
              )}
            >
              {value === "training" ? "Train next" : "Physique"}
            </button>
          ))}
        </div>

        {mode === "physique" && !hasScan ? (
          <div className="mt-5 text-center">
            <p className="text-[15px] font-semibold">No Body Scan yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              A scan scores each muscle group from one photo.
            </p>
            <Link to="/scan/body" className={cn(primaryButtonClass, "mt-4 h-12")}>
              <ScanLine /> Take a Body Scan
            </Link>
          </div>
        ) : (
          <>
            <AnatomyPair
              fills={fills}
              className="mx-auto mt-5 max-w-[290px]"
              figureClassName="max-h-[220px]"
              label={mode === "training" ? "Training map" : "Physique scan map"}
            />

            {mode === "training" && !hasTraining ? (
              <div className="mt-5 border-t border-hairline pt-4 text-center">
                <p className="text-[15px] font-semibold">No workouts logged this week</p>
                <p className="mx-auto mt-1 max-w-[30ch] text-[13px] text-muted-foreground">
                  Finish a workout and this map shows which muscles to train next.
                </p>
                <Link to="/workouts" className={cn(primaryButtonClass, "mt-4 h-12")}>
                  <Dumbbell /> Go to today&apos;s workout
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-center gap-4 text-[12px] text-muted-foreground">
                  {legend.map(([label, color]) => (
                    <span key={label} className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                </div>
                <ul className="mt-5 space-y-3.5 border-t border-hairline pt-4">
                  {ranked.slice(0, 5).map((insight) => {
                    if (mode === "training") {
                      const done = Math.min(1, insight.sets7d / insight.targetSets);
                      const next = trainNext.has(insight.muscle);
                      const recovering = RECOVERING.has(insight.status);
                      const color = recovering
                        ? "var(--color-analytics-violet)"
                        : next
                          ? "var(--color-neon)"
                          : "var(--color-score-high)";
                      return (
                        <li key={insight.muscle}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[14px] font-semibold">{insight.label}</span>
                            <span className="text-[13px] text-muted-foreground">
                              <span className="font-semibold tabular-nums text-foreground">
                                {Math.round(insight.sets7d)}/{insight.targetSets}
                              </span>{" "}
                              sets ·{" "}
                              <span style={{ color }}>
                                {recovering ? "Recovering" : next ? "Train next" : insight.status}
                              </span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${done * 100}%`, backgroundColor: color }}
                            />
                          </div>
                        </li>
                      );
                    }
                    const value = insight.scanScore;
                    return (
                      <li key={insight.muscle}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[14px] font-semibold">{insight.label}</span>
                          <span
                            className="text-[13px] font-semibold tabular-nums"
                            style={{ color: scoreColor(value) }}
                          >
                            {value == null ? "Not visible" : Math.round(value)}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${value ?? 0}%`, backgroundColor: scoreColor(value) }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-[11px] text-muted-foreground/80">
                  {mode === "training"
                    ? "Bars show this week's completed sets against your target. An estimate, not a medical measurement."
                    : "From your latest scan. Areas the camera couldn't see stay unscored."}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function bodyScanMetrics(result: BodyScanAiResult) {
  const groups = result.muscleGroups;
  return {
    shoulders: groups.upperBody.shoulders,
    chest: groups.upperBody.chest,
    back: groups.upperBody.back,
    arms: groups.upperBody.arms,
    core: groups.core.core,
    glutes: groups.lowerBody.glutes,
    quads: groups.lowerBody.quads,
    hamstrings: groups.lowerBody.hamstrings,
    calves: groups.lowerBody.calves,
  } satisfies Partial<Record<CanonicalMuscle, MuscleScanMetric>>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className={cn(cardClass, "rounded-[20px] p-4")}>
      <Icon className="size-5 text-neon" />
      <div className="mt-4 text-[24px] font-bold leading-none tracking-[-0.03em] tabular-nums">
        {value}
        {unit && <span className="ml-1 text-[13px] font-medium text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-1.5 text-[13px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Record({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 py-3 text-[15px]",
        !last && "border-b border-hairline",
      )}
    >
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold tabular-nums">{value}</span>
    </div>
  );
}
