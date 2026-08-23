import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Flame,
  Clock,
  Trophy,
  TrendingUp,
  Dumbbell,
  ChevronRight,
  Activity,
  ScanLine,
  UserRound,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCompletedWorkouts, computePRs } from "@/lib/workoutSessionStore";
import { useProgress, useWorkoutLog } from "@/lib/progressStore";
import { GoalPanel } from "@/components/GoalPanel";
import { ProgressPicturesCard } from "@/components/photos/ProgressPicturesCard";
import { WeeklyReportCard } from "@/components/weekly/WeeklyReportCard";
import { MuscleHeatmap } from "@/components/analytics/MuscleHeatmap";
import {
  computeMuscleInsights,
  muscleMetricLabel,
  type CanonicalMuscle,
  type MuscleScanMetric,
  type MuscleInsight,
} from "@/lib/muscleAnalytics";
import { useProfile } from "@/lib/profile";
import { useAuthSession } from "@/lib/authSession";
import { getScanSubmission, listScanSubmissions } from "@/lib/scanSubmissions.functions";
import { parseBodyScanResult, type BodyScanAiResult } from "@/lib/bodyScan.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({ meta: [{ title: "Progress — Ascendr" }] }),
  component: ProgressPage,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ProgressPage() {
  const { profile } = useProfile();
  const session = useAuthSession();
  const history = useCompletedWorkouts();
  const log = useWorkoutLog();
  const progress = useProgress();
  const prs = useMemo(() => computePRs(history), [history]);
  const listScans = useServerFn(listScanSubmissions);
  const getScan = useServerFn(getScanSubmission);
  const scanHistoryQuery = useQuery({
    queryKey: ["scan-submissions", "body", "progress"],
    queryFn: () => listScans({ data: { scanType: "body" } }),
    enabled: session !== "loading" && Boolean(session),
    staleTime: 60_000,
    retry: false,
  });
  const latestScanId = scanHistoryQuery.data?.[0]?.id;
  const scanDetailQuery = useQuery({
    queryKey: ["scan-submission", "body", latestScanId, "progress"],
    queryFn: () => getScan({ data: { id: latestScanId as string, scanType: "body" } }),
    enabled: Boolean(latestScanId),
    staleTime: 60_000,
    retry: false,
  });
  const scanResult = useMemo(
    () => (scanDetailQuery.data ? parseBodyScanResult(scanDetailQuery.data.analysis) : null),
    [scanDetailQuery.data],
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
    return DAY_LABELS.map((d, i) => ({ d, v: (minutes[i] / max) * 100, m: minutes[i] }));
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
  const activeDays = week.filter((day) => day.m > 0).length;

  const prEntries = Object.entries(prs.maxWeightByExercise)
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, 5);
  const e1rmEntries = Object.entries(prs.best1RMByExercise)
    .sort((a, b) => b[1].e1rm - a[1].e1rm)
    .slice(0, 3);

  return (
    <div className="animate-slide-up px-4 pb-8 pt-5 sm:px-5 sm:pt-6">
      <header className="flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">Performance</p>
          <h1 className="mt-1 text-[29px] font-extrabold leading-tight tracking-[-0.04em]">
            Proof you&apos;re progressing.
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Training consistency, volume, records, and physique changes.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to="/workout/history"
            aria-label="Workout history"
            className="grid h-[44px] w-[44px] place-items-center rounded-2xl border border-white/[0.06] bg-surface text-muted-foreground transition active:scale-95"
          >
            <Clock className="size-5" />
          </Link>
          <Link
            to="/profile"
            aria-label="Open profile"
            className="grid h-[44px] w-[44px] place-items-center rounded-2xl border border-white/[0.06] bg-surface text-neon transition active:scale-95"
          >
            <UserRound className="size-5" />
          </Link>
        </div>
      </header>

      <MuscleIntelligence
        insights={muscleInsights}
        hasScan={Boolean(scanResult)}
        scanLoading={scanHistoryQuery.isLoading || scanDetailQuery.isLoading}
      />

      <PhysiqueMomentum
        result={scanResult}
        loading={scanHistoryQuery.isLoading || scanDetailQuery.isLoading}
      />

      <div className="mt-6">
        <WeeklyReportCard />
      </div>

      <div className="mt-4">
        <GoalPanel />
      </div>

      <div className="mt-4">
        <ProgressPicturesCard />
      </div>

      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between px-1">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">
              At a glance
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold">Your training numbers</h2>
          </div>
          <Link
            to="/workout/history"
            className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
          >
            History <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Flame} label="This week" value={`${weeklyCalories}`} unit="kcal" />
          <StatCard
            icon={Clock}
            label="Trained"
            value={trainedH > 0 ? `${trainedH}h ${trainedM}m` : `${trainedM}m`}
          />
          <StatCard icon={Trophy} label="Streak" value={`${progress.streakDays} days`} />
          <StatCard icon={TrendingUp} label="Workouts" value={`${prs.totalWorkouts}`} tint />
        </div>
      </section>

      <section className="relative mt-7 overflow-hidden rounded-[27px] border border-white/[0.07] bg-surface p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-neon/[0.06] blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">This week</p>
            <h2 className="mt-1 font-extrabold">Training rhythm</h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {activeDays
                ? `${activeDays} active day${activeDays === 1 ? "" : "s"}`
                : "Your first session starts the chart"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 text-right">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="mt-0.5 text-lg font-extrabold tabular-nums">
              {weeklyMinutes}
              <span className="ml-1 text-[9px] font-semibold text-muted-foreground">min</span>
            </p>
          </div>
        </div>
        <div className="relative mt-5 flex h-44 items-end gap-3 rounded-2xl border border-white/[0.04] bg-black/15 px-3 pb-3 pt-5">
          <div className="pointer-events-none absolute inset-x-3 top-1/3 border-t border-dashed border-white/[0.06]" />
          <div className="pointer-events-none absolute inset-x-3 top-2/3 border-t border-dashed border-white/[0.06]" />
          {week.map((day) => (
            <div
              key={day.d}
              className="relative z-10 flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="text-[10px] text-muted-foreground tabular-nums">
                {day.m > 0 ? day.m : ""}
              </div>
              <div
                className="min-h-0 w-full rounded-t-[9px] bg-gradient-to-t from-neon to-emerald-300 shadow-[0_0_18px_-8px_var(--color-neon)] transition-all"
                style={{ height: `${Math.max(2, day.v)}%` }}
              />
              <span className="text-[9px] font-semibold text-muted-foreground">
                {day.d.slice(0, 1)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[27px] border border-white/[0.07] bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-neon">Workload</p>
            <h2 className="mt-1 font-extrabold">Volume & sets</h2>
          </div>
          <Activity className="size-5 text-neon" />
        </div>
        <Record label="Total sets" value={`${prs.totalSets}`} />
        <Record label="Total reps" value={`${prs.totalReps}`} />
        <Record label="Total volume" value={`${prs.totalVolume.toLocaleString()}`} />
        <Record
          label="Best workout volume"
          value={
            prs.bestVolumeWorkout
              ? `${prs.bestVolumeWorkout.volume.toLocaleString()} ${prs.bestVolumeWorkout.unit}`
              : "—"
          }
          last
        />
      </section>

      <section className="mt-6 rounded-[27px] border border-white/[0.07] bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Personal records</h2>
          <Dumbbell className="size-4 text-neon" />
        </div>
        {prEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete a workout with weights to start tracking PRs.
          </p>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Heaviest sets
            </div>
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
                <div className="mt-4 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Estimated 1RM
                </div>
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
    </div>
  );
}

function PhysiqueMomentum({
  result,
  loading,
}: {
  result: BodyScanAiResult | null;
  loading: boolean;
}) {
  const score = result?.overallScore ?? 0;
  const comparison = result?.comparison;
  const delta = comparison?.scoreDeltas?.overallScore;
  const circumference = 2 * Math.PI * 34;
  const dashOffset = circumference - (circumference * score) / 100;
  const metrics = result
    ? [
        { label: "Muscle", score: result.muscleDevelopment.score },
        { label: "V-taper", score: result.vTaper.score },
        { label: "Symmetry", score: result.symmetry.score },
      ]
    : [];

  return (
    <section className="relative mt-4 overflow-hidden rounded-[28px] border border-analytics-violet/20 bg-gradient-to-br from-analytics-violet/[0.16] via-surface to-surface p-4 shadow-[0_24px_55px_-38px_oklch(0.62_0.16_300/0.8)]">
      <div className="pointer-events-none absolute -bottom-16 -right-14 size-56 rounded-full border border-analytics-violet/10" />
      <div className="pointer-events-none absolute -bottom-24 -right-8 size-52 rounded-full bg-analytics-violet/[0.08] blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="relative grid size-[78px] shrink-0 place-items-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="5"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--analytics-violet)"
              strokeLinecap="round"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-[stroke-dashoffset] duration-700"
            />
          </svg>
          <div className="text-center">
            <strong className="block text-[24px] font-extrabold leading-none tabular-nums">
              {result ? score : "—"}
            </strong>
            <span className="mt-1 block text-[7px] font-black uppercase tracking-wider text-muted-foreground">
              scan score
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-analytics-violet">
            Body momentum
          </p>
          <h2 className="mt-1 text-[18px] font-extrabold tracking-[-0.025em]">
            {loading
              ? "Checking your latest scan…"
              : result
                ? "A clearer body-progress story."
                : "Set your physique baseline."}
          </h2>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            {loading
              ? "Your scan data is loading securely."
              : result
                ? (comparison?.summary ??
                  "Your latest scan anchors the visual side of your progress.")
                : "Pair training data with a private Body Scan—then measure visual changes with clear evidence."}
          </p>
        </div>
      </div>

      {result ? (
        <>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/[0.065] bg-black/20 px-2.5 py-2.5"
              >
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-1 text-[17px] font-extrabold tabular-nums">
                  {metric.score}
                  <span className="ml-0.5 text-[9px] font-semibold text-muted-foreground">
                    /100
                  </span>
                </p>
              </div>
            ))}
          </div>
          {typeof delta === "number" && (
            <p className="relative mt-3 inline-flex rounded-full border border-analytics-violet/20 bg-analytics-violet/10 px-2.5 py-1 text-[9px] font-bold text-analytics-violet">
              {delta > 0 ? "+" : ""}
              {delta} overall since your matched baseline
            </p>
          )}
          <Link
            to="/scan/body"
            className="relative mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-white text-[10px] font-extrabold text-black transition active:scale-[0.98]"
          >
            Explore body progress <ChevronRight className="size-3.5" />
          </Link>
        </>
      ) : !loading ? (
        <Link
          to="/scan/body"
          className="relative mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-analytics-violet text-[10px] font-extrabold text-black transition active:scale-[0.98]"
        >
          Create body baseline <ScanLine className="size-3.5" />
        </Link>
      ) : null}
    </section>
  );
}

function MuscleIntelligence({
  insights,
  hasScan,
  scanLoading,
}: {
  insights: MuscleInsight[];
  hasScan: boolean;
  scanLoading: boolean;
}) {
  const [mode, setMode] = useState<"training" | "physique">("training");
  const [selected, setSelected] = useState<CanonicalMuscle>(insights[0]?.muscle ?? "shoulders");
  const selectedInsight = insights.find((item) => item.muscle === selected) ?? insights[0];
  const ranked = useMemo(
    () =>
      [...insights].sort((a, b) =>
        mode === "training" ? b.priority - a.priority : (b.scanScore ?? -1) - (a.scanScore ?? -1),
      ),
    [insights, mode],
  );

  return (
    <section className="premium-panel relative mt-5 overflow-hidden rounded-[30px] p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-analytics-teal/[0.07] blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="data-kicker text-neon">Muscle intelligence</p>
          <h2 className="mt-1 text-xl font-extrabold">Each muscle, individually ranked.</h2>
          <p className="mt-1 max-w-[280px] text-[10px] leading-relaxed text-muted-foreground">
            Know what to train next—and keep physique development in its own honest view.
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-neon/10 text-neon">
          <Sparkles className="size-[18px]" />
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-1 rounded-[18px] border border-white/[0.06] bg-black/25 p-1">
        {(["training", "physique"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "tap rounded-[14px] px-3 text-[10px] font-extrabold transition",
              mode === value
                ? "bg-white text-black shadow-lg"
                : "text-muted-foreground hover:text-white",
            )}
          >
            {value === "training" ? "Train next" : "Physique"}
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <MuscleHeatmap insights={insights} mode={mode} selected={selected} onSelect={setSelected} />
      </div>

      {selectedInsight && (
        <div className="relative mt-4 rounded-[21px] border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Selected region
              </p>
              <h3 className="mt-1 text-lg font-extrabold">{selectedInsight.label}</h3>
            </div>
            <strong className="text-right text-2xl font-extrabold tabular-nums text-neon">
              {mode === "training"
                ? `${selectedInsight.priority}%`
                : selectedInsight.scanScore == null
                  ? "—"
                  : `${Math.round(selectedInsight.scanScore)}`}
              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                {mode === "training" ? "priority" : "scan score"}
              </span>
            </strong>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {mode === "training"
              ? `${selectedInsight.readiness}% estimated readiness · ${selectedInsight.sets7d} of ${selectedInsight.targetSets} planned weekly sets. ${selectedInsight.status}.`
              : selectedInsight.scanScore == null
                ? "Not visible in the latest scan. Ascendr will not invent a development score without clear evidence."
                : `${muscleMetricLabel(selectedInsight, "physique")} · ${selectedInsight.scanVisibility === "partial" ? "Partially visible" : "Clearly visible"} in the latest scan.`}
          </p>
        </div>
      )}

      <div className="relative mt-4 space-y-2">
        {ranked.slice(0, 4).map((insight, index) => (
          <button
            key={insight.muscle}
            type="button"
            onClick={() => setSelected(insight.muscle)}
            className="tap flex w-full items-center gap-3 rounded-2xl border border-white/[0.055] bg-black/15 px-3 py-2.5 text-left transition hover:border-white/10"
          >
            <span className="w-5 text-[11px] font-extrabold text-white/30">{index + 1}</span>
            <span className="min-w-0 flex-1 text-[11px] font-bold">{insight.label}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">
              {mode === "training" ? insight.status : muscleMetricLabel(insight, mode)}
            </span>
          </button>
        ))}
      </div>

      {mode === "physique" && !hasScan && (
        <div className="relative mt-4 rounded-[20px] border border-dashed border-white/10 bg-black/15 p-4 text-center">
          <ScanLine className="mx-auto size-5 text-neon" />
          <p className="mt-2 text-[11px] font-bold">
            {scanLoading ? "Checking your latest scan…" : "No physique scan yet"}
          </p>
          {!scanLoading && (
            <Link
              to="/scan/body"
              className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-neon px-5 text-[10px] font-extrabold text-neon-foreground"
            >
              Open Body Scan
            </Link>
          )}
        </div>
      )}
      {mode === "physique" && hasScan && (
        <Link
          to="/scan/body"
          className="relative mt-4 flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 text-[10px] font-extrabold text-white/75"
        >
          View full scan report <ChevronRight className="size-3.5" />
        </Link>
      )}
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
  tint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  unit?: string;
  tint?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[23px] border p-4 ${
        tint
          ? "border-neon bg-neon text-neon-foreground shadow-[0_18px_35px_-24px_var(--color-neon)]"
          : "border-white/[0.06] bg-surface"
      }`}
    >
      <span
        className={`grid size-9 place-items-center rounded-xl ${tint ? "bg-black/10" : "bg-white/[0.045] text-neon"}`}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="mt-5 text-[22px] font-extrabold tracking-[-0.03em]">
        {value}
        {unit && <span className="text-sm font-medium ml-1 opacity-70">{unit}</span>}
      </div>
      <div
        className={`mt-0.5 text-[10px] font-semibold ${tint ? "opacity-75" : "text-muted-foreground"}`}
      >
        {label}
      </div>
    </div>
  );
}

function Record({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2.5 text-sm ${last ? "" : "border-b border-border"}`}>
      <span className="text-muted-foreground truncate pr-3">{label}</span>
      <span className="font-semibold tabular-nums shrink-0">{value}</span>
    </div>
  );
}
