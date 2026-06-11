import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, RotateCcw, Play, Check, Clock, Flame, Dumbbell, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile, GOAL_LABELS } from "@/lib/profile";
import { workoutRecommendationService, type Category } from "@/lib/workouts";
import {
  weeklyScheduleService,
  toggleCompletion,
  loadCompletion,
  type WeeklyScheduleDay,
} from "@/lib/weeklySchedule";
import { WorkoutCardTile } from "@/components/WorkoutCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({ meta: [{ title: "Workouts — Pulse" }] }),
  component: WorkoutsPage,
});

const TABS = ["Recommended", "Weekly Schedule", "All Workouts"] as const;
type Tab = (typeof TABS)[number];

function WorkoutsPage() {
  const { profile } = useProfile();
  const [tab, setTab] = useState<Tab>("Recommended");

  return (
    <div className="px-5 pt-6 pb-28 animate-slide-up">
      <h1 className="text-3xl font-bold">Workouts</h1>
      {profile && (
        <p className="text-xs text-muted-foreground mt-1">
          Tailored to {GOAL_LABELS[profile.goal].toLowerCase()} · {profile.daysPerWeek} days / wk
        </p>
      )}

      {/* Segmented tabs */}
      <div className="mt-5 relative grid grid-cols-3 bg-white/[0.04] border border-white/[0.06] rounded-full p-1">
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative h-9 text-[11px] font-semibold rounded-full"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-neon rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className={cn("relative", active ? "text-neon-foreground" : "text-muted-foreground")}>
                {t}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          {tab === "Recommended" && <RecommendedView />}
          {tab === "Weekly Schedule" && <WeeklyScheduleView />}
          {tab === "All Workouts" && <AllWorkoutsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- Recommended ----------------------------- */

function RecommendedView() {
  const { profile } = useProfile();
  if (!profile) return null;
  const list = workoutRecommendationService.recommend(profile, 12);
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((w) => <WorkoutCardTile key={w.id} w={w} />)}
    </div>
  );
}

/* ----------------------------- All Workouts ----------------------------- */

const categoryChips = ["All", "Strength", "HIIT", "Cardio", "Core", "Mobility"] as const;
type CatChip = (typeof categoryChips)[number];

function AllWorkoutsView() {
  const { profile } = useProfile();
  const [chip, setChip] = useState<CatChip>("All");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    if (!profile) return [];
    const cat: Category | "All" = chip;
    const items = workoutRecommendationService.filterByCategory(profile, cat);
    return q ? items.filter((w) => w.title.toLowerCase().includes(q.toLowerCase())) : items;
  }, [profile, chip, q]);

  return (
    <div>
      <label className="flex items-center gap-3 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder="Search workouts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={60}
        />
      </label>
      <div className="-mx-5 px-5 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categoryChips.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={cn(
              "shrink-0 h-9 px-4 rounded-full text-xs font-semibold border transition",
              chip === c
                ? "bg-neon text-neon-foreground border-neon"
                : "bg-white/[0.04] border-white/[0.06] text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {list.map((w) => <WorkoutCardTile key={w.id} w={w} />)}
      </div>
      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-12 text-sm">No workouts match.</p>
      )}
    </div>
  );
}

/* ----------------------------- Weekly Schedule ----------------------------- */

function WeeklyScheduleView() {
  const { profile } = useProfile();
  const [schedule, setSchedule] = useState<WeeklyScheduleDay[]>(() =>
    profile ? weeklyScheduleService.generateSchedule(profile) : []
  );
  const [toast, setToast] = useState<string | null>(null);

  if (!profile) return null;

  const rebuild = () => {
    setSchedule(weeklyScheduleService.generateSchedule(profile));
    setToast("Weekly plan rebuilt");
    setTimeout(() => setToast(null), 1800);
  };

  const onToggle = (id: string) => {
    const next = toggleCompletion(id);
    setSchedule((cur) =>
      cur.map((d) => ({ ...d, isCompleted: !!next.completed[d.id] }))
    );
  };

  const trainingDays = schedule.filter((d) => !d.isRestDay).length;
  const completedDays = schedule.filter((d) => d.isCompleted && !d.isRestDay).length;

  return (
    <div>
      <div className="rounded-[24px] bg-gradient-to-br from-neon/15 to-transparent border border-white/[0.06] p-4 flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-neon/20 grid place-items-center">
          <Sparkles className="size-5 text-neon" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Your weekly plan</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {completedDays}/{trainingDays} sessions complete · {profile.daysPerWeek} days/wk
          </div>
        </div>
        <button
          onClick={rebuild}
          className="h-10 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition"
        >
          <RotateCcw className="size-3.5" /> Rebuild
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 text-center text-[11px] text-neon font-semibold"
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-3">
        {schedule.map((day, i) => (
          <motion.div
            key={day.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            {day.isRestDay ? <RestDayCard day={day} /> : <TrainingDayCard day={day} onToggle={onToggle} />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ day }: { day: WeeklyScheduleDay }) {
  if (day.isCompleted) {
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center gap-1">
        <Check className="size-3" /> Done
      </span>
    );
  }
  if (day.isToday) {
    return (
      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-neon text-neon-foreground">
        Today
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold uppercase px-2 py-1 rounded-full bg-white/[0.05] text-muted-foreground">
      Upcoming
    </span>
  );
}

function TrainingDayCard({ day, onToggle }: { day: WeeklyScheduleDay; onToggle: (id: string) => void }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-5 transition",
        day.isToday
          ? "bg-gradient-to-br from-neon/10 via-white/[0.03] to-white/[0.02] border-neon/40"
          : "bg-white/[0.03] border-white/[0.06]"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{day.dayName}</div>
          <h3 className="mt-0.5 text-xl font-extrabold leading-tight">{day.workoutTitle}</h3>
        </div>
        <StatusBadge day={day} />
      </div>

      <p className="mt-1 text-[12px] text-muted-foreground">{day.focus}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
        <Pill icon={Clock}>{day.duration} min</Pill>
        <Pill icon={Dumbbell}>{day.difficulty}</Pill>
        <Pill icon={Flame}>{day.estimatedCalories} kcal</Pill>
        <span className="px-2 py-1 rounded-full bg-white/[0.05] text-muted-foreground">{day.equipment}</span>
      </div>

      {day.exercises.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {day.exercises.slice(0, 4).map((ex) => (
            <span key={ex} className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.05]">
              {ex}
            </span>
          ))}
          {day.exercises.length > 4 && (
            <span className="text-[10px] px-2 py-1 rounded-md text-muted-foreground">
              +{day.exercises.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {day.workoutId ? (
          <Link
            to="/workout/$id"
            params={{ id: day.workoutId }}
            className="flex-1 h-11 rounded-full bg-neon text-neon-foreground font-semibold text-[13px] flex items-center justify-center gap-1.5 glow-neon active:scale-[0.98] transition"
          >
            <Play className="size-4 fill-current" /> Start
          </Link>
        ) : (
          <button
            disabled
            className="flex-1 h-11 rounded-full bg-white/[0.05] text-muted-foreground font-semibold text-[13px]"
          >
            No match
          </button>
        )}
        {day.workoutId && (
          <Link
            to="/workout/$id"
            params={{ id: day.workoutId }}
            className="h-11 px-4 rounded-full bg-white/[0.05] border border-white/[0.06] text-[12px] font-semibold flex items-center"
          >
            Details
          </Link>
        )}
        <button
          onClick={() => onToggle(day.id)}
          aria-label="Mark complete"
          className={cn(
            "size-11 rounded-full grid place-items-center border transition",
            day.isCompleted
              ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-300"
              : "bg-white/[0.04] border-white/[0.06] text-muted-foreground"
          )}
        >
          <Check className="size-4" />
        </button>
      </div>
    </div>
  );
}

function RestDayCard({ day }: { day: WeeklyScheduleDay }) {
  return (
    <div className="rounded-[24px] border border-white/[0.04] bg-white/[0.015] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{day.dayName}</div>
          <h3 className="mt-0.5 text-lg font-bold text-muted-foreground">Rest & Recovery</h3>
        </div>
        {day.isToday && (
          <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-neon text-neon-foreground">
            Today
          </span>
        )}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">Stretch, walk, hydrate, and recover.</p>
      <Link
        to="/workout/$id"
        params={{ id: "mobility-recovery" }}
        className="mt-3 inline-flex h-9 px-4 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-semibold items-center"
      >
        Mobility Session
      </Link>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Clock; children: React.ReactNode }) {
  return (
    <span className="px-2 py-1 rounded-full bg-white/[0.05] flex items-center gap-1 tabular-nums">
      <Icon className="size-3" />
      {children}
    </span>
  );
}

// Ensure loadCompletion gets bundled even though it's only re-exported.
void loadCompletion;
