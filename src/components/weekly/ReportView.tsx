import { ScoreRing } from "./ScoreRing";
import {
  Trophy,
  Flame,
  Dumbbell,
  Drumstick,
  Notebook,
  Medal,
  Target,
  Camera,
  Apple,
  Scale,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { WeeklyReportDTO } from "@/lib/weeklyReport.functions";

const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  flame: Flame,
  dumbbell: Dumbbell,
  drumstick: Drumstick,
  notebook: Notebook,
  medal: Medal,
  target: Target,
  camera: Camera,
};

function fmtRange(s: string, e: string) {
  const a = new Date(s + "T00:00:00Z");
  const b = new Date(e + "T00:00:00Z");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`;
}

export function ReportView({ r }: { r: WeeklyReportDTO }) {
  const empty =
    r.workoutsCompleted === 0 &&
    r.averageCalories === 0 &&
    r.proteinHitDays === 0 &&
    r.startingWeightKg === null;
  if (empty) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center">
        <Sparkles className="size-8 text-neon mx-auto mb-2" />
        <h3 className="font-bold mb-1">No data yet</h3>
        <p className="text-sm text-muted-foreground">
          Log workouts and meals this week to generate your first weekly report.
        </p>
      </div>
    );
  }
  const calTarget =
    r.averageCalories && r.calorieAdherence
      ? Math.round(r.averageCalories / Math.max(0.01, r.calorieAdherence / 100))
      : 0;
  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="rounded-3xl bg-gradient-to-br from-neon/10 via-surface to-surface border border-neon/20 p-5">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
          {fmtRange(r.weekStart, r.weekEnd)}
          {r.isFinalized ? " · Finalized" : " · In progress"}
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={r.overallScore} size={110} label="Overall" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">
              {r.workoutsCompleted}/{r.plannedWorkouts} workouts · {r.proteinHitDays}/7 protein days
            </div>
            <div className="text-sm font-semibold mt-1">
              {r.achievements[0]?.label ?? "Keep logging"}
            </div>
            {r.missedWorkouts > 0 && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Focus next week: close {r.missedWorkouts} missed session
                {r.missedWorkouts === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>
        {r.aiSummary && (
          <div className="mt-4 rounded-2xl bg-white/[0.04] border border-white/[0.05] p-3 text-sm leading-relaxed">
            {r.aiSummary}
          </div>
        )}
      </section>

      {/* Workouts */}
      <Section title="Workouts" icon={Dumbbell}>
        <Stat label="Completed" value={`${r.workoutsCompleted} / ${r.plannedWorkouts}`} />
        <Stat label="Total volume" value={`${r.totalVolumeKg.toLocaleString()} kg`} />
        <Stat label="Total sets" value={`${r.totalSets}`} />
        <Stat label="Total reps" value={`${r.totalReps}`} />
        {r.prs.length > 0 && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              New PRs
            </div>
            {r.prs.map((p, i) => (
              <div key={i} className="text-sm font-semibold flex items-center gap-2">
                <Medal className="size-3.5 text-neon" />
                {p.name}
                {p.note ? ` — ${p.note}` : ""}
              </div>
            ))}
          </div>
        )}
        {r.topMuscleGroups.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Top muscle groups
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.topMuscleGroups.map((m) => (
                <span
                  key={m.name}
                  className="px-2.5 py-1 rounded-full bg-neon/10 border border-neon/20 text-[11px] font-semibold text-neon capitalize"
                >
                  {m.name}
                  {m.count ? ` · ${m.count}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Nutrition */}
      <Section title="Nutrition" icon={Apple}>
        <Stat
          label="Avg calories"
          value={`${r.averageCalories}${calTarget ? ` / ${calTarget}` : ""} kcal`}
        />
        <Stat label="Calorie adherence" value={`${r.calorieAdherence}%`} />
        <Stat label="Avg protein" value={`${r.averageProteinG} g`} />
        <Stat label="Protein goal hit" value={`${r.proteinHitDays} / 7 days`} />
      </Section>

      {/* Body */}
      <Section title="Body progress" icon={Scale}>
        <Stat
          label="Starting weight"
          value={r.startingWeightKg !== null ? `${r.startingWeightKg} kg` : "—"}
        />
        <Stat
          label="Ending weight"
          value={r.endingWeightKg !== null ? `${r.endingWeightKg} kg` : "—"}
        />
        <Stat
          label="Change"
          value={
            r.weightChangeKg !== null
              ? `${r.weightChangeKg > 0 ? "+" : ""}${r.weightChangeKg} kg`
              : "—"
          }
        />
      </Section>

      {/* Consistency breakdown */}
      <Section title="Consistency score" icon={Sparkles}>
        <div className="flex items-center gap-4 mb-3">
          <ScoreRing score={r.consistencyScore} size={92} label="Score" />
          <div className="flex-1 text-[12px] text-muted-foreground">
            Calculated from workouts, nutrition logging, protein, calories, activity, and recovery.
          </div>
        </div>
        <Bar
          label="Workout completion"
          value={Math.min(100, (r.workoutsCompleted / Math.max(1, r.plannedWorkouts)) * 100)}
        />
        <Bar
          label="Nutrition logging"
          value={Math.min(100, (r.perDay.filter((d) => d.calories > 0).length / 7) * 100)}
        />
        <Bar label="Protein hit rate" value={Math.min(100, (r.proteinHitDays / 7) * 100)} />
        <Bar label="Calorie adherence" value={r.calorieAdherence} />
      </Section>

      {/* Next week plan */}
      <Section title="Next week plan" icon={Target}>
        <Stat label="Workouts" value={`${r.nextWeekPlan.workouts}`} />
        <Stat label="Protein goal days" value={`${r.nextWeekPlan.proteinDays}`} />
        <Stat label="Log meals" value={`${r.nextWeekPlan.logDays} / 7 days`} />
        <Stat label="Cardio sessions" value={`${r.nextWeekPlan.cardio}`} />
        <Stat label="Progress photos" value={`${r.nextWeekPlan.photos}`} />
      </Section>

      {/* Achievements */}
      {r.achievements.length > 0 && (
        <Section title="Achievements" icon={Trophy}>
          <div className="grid grid-cols-2 gap-2">
            {r.achievements.map((a) => {
              const Icon = ICONS[a.icon] ?? Trophy;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.05] p-3"
                >
                  <div className="size-8 rounded-full bg-neon/10 grid place-items-center">
                    <Icon className="size-4 text-neon" />
                  </div>
                  <span className="text-[12px] font-semibold">{a.label}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-5 border border-white/[0.05]">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="size-4 text-neon" />
        <h2 className="font-bold text-sm">{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 text-sm border-b border-white/[0.05] last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{Math.round(v)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon to-emerald-300 transition-all"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
