import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  Plus,
  Minus,
  Trash2,
  Check,
  StickyNote,
  Save,
} from "lucide-react";
import {
  getCompletedWorkout,
  updateCompletedWorkout,
  deleteCompletedWorkout,
  type CompletedWorkout,
  type ExerciseLog,
  type SetLog,
} from "@/lib/workoutSessionStore";

export const Route = createFileRoute("/workout/history/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${getCompletedWorkout(params.id)?.workoutTitle ?? "Workout"} — History` }],
  }),
  loader: ({ params }) => {
    const w = getCompletedWorkout(params.id);
    if (!w) throw notFound();
    return w;
  },
  component: HistoryDetail,
  notFoundComponent: () => (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Workout not found</h1>
        <Link to="/workout/history" className="mt-4 inline-block text-neon">
          Back to history
        </Link>
      </div>
    </div>
  ),
});

function HistoryDetail() {
  const initial = Route.useLoaderData() as CompletedWorkout;
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CompletedWorkout>(initial);
  const [dirty, setDirty] = useState(false);

  const setExercises = (updater: (ex: ExerciseLog[]) => ExerciseLog[]) => {
    setDraft((d) => ({ ...d, exercises: updater(d.exercises) }));
    setDirty(true);
  };
  const updateSet = (exId: string, setNumber: number, patch: Partial<SetLog>) => {
    setExercises((list) =>
      list.map((e) =>
        e.id !== exId
          ? e
          : { ...e, sets: e.sets.map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s)) },
      ),
    );
  };
  const addSet = (exId: string) => {
    setExercises((list) =>
      list.map((e) => {
        if (e.id !== exId) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              setNumber: e.sets.length + 1,
              plannedReps: last?.plannedReps,
              actualReps: last?.actualReps ?? 0,
              weight: last?.weight ?? 0,
              unit: draft.unit,
              completed: true,
              completedAt: new Date().toISOString(),
              isExtraSet: true,
            },
          ],
        };
      }),
    );
  };
  const removeSet = (exId: string, setNumber: number) => {
    setExercises((list) =>
      list.map((e) => {
        if (e.id !== exId) return e;
        const filtered = e.sets.filter((s) => s.setNumber !== setNumber);
        return { ...e, sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })) };
      }),
    );
  };

  const totals = useMemo(() => {
    let sets = 0,
      reps = 0,
      vol = 0;
    for (const e of draft.exercises)
      for (const s of e.sets) {
        if (!s.completed) continue;
        sets++;
        reps += s.actualReps;
        vol += (s.weight || 0) * s.actualReps;
      }
    return { sets, reps, vol };
  }, [draft]);

  const save = () => {
    updateCompletedWorkout(draft.id, {
      exercises: draft.exercises,
      notes: draft.notes,
    });
    setDirty(false);
  };

  const onDelete = () => {
    if (confirm("Delete this workout from history? This cannot be undone.")) {
      deleteCompletedWorkout(draft.id);
      navigate({ to: "/workout/history" });
    }
  };

  const weightStep = draft.unit === "kg" ? 2.5 : 5;

  return (
    <div className="mx-auto min-h-dvh w-full min-w-0 max-w-md overflow-x-clip bg-background page-pb-safe">
      <div className="flex min-w-0 items-center gap-3 px-4 pb-3 page-pt-safe sm:px-5">
        <Link
          to="/workout/history"
          className="size-10 rounded-full bg-white/[0.06] grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <Calendar className="size-3" />
            {new Date(draft.completedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
          <div className="font-bold truncate">{draft.workoutTitle}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 min-[380px]:grid-cols-4 sm:px-5">
        <Stat icon={<Clock className="size-3" />} label="min" value={`${draft.durationMin}`} />
        <Stat icon={<Dumbbell className="size-3" />} label="sets" value={`${totals.sets}`} />
        <Stat label="reps" value={`${totals.reps}`} />
        <Stat
          icon={<Flame className="size-3 text-neon" />}
          label={draft.unit}
          value={totals.vol.toLocaleString()}
        />
      </div>

      <div className="mt-5 flex min-w-0 flex-col gap-4 px-4 sm:px-5">
        {draft.exercises.map((e) => (
          <div key={e.id} className="rounded-3xl bg-surface border border-white/[0.05] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{e.exerciseName}</div>
                <div className="text-[11px] text-muted-foreground">{e.muscleGroup}</div>
              </div>
              {e.isBodyweight && (
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-neon/15 text-neon">
                  Bodyweight
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_32px_32px] gap-1.5 px-1 text-[9px] uppercase tracking-wide text-muted-foreground min-[380px]:grid-cols-[28px_1fr_1fr_36px_36px] min-[380px]:gap-2 min-[380px]:px-2 min-[380px]:text-[10px] min-[380px]:tracking-wider">
              <span>#</span>
              <span>Reps</span>
              <span>Weight ({draft.unit})</span>
              <span className="text-center">Done</span>
              <span className="text-center">Del</span>
            </div>

            <div className="mt-1 flex flex-col gap-1.5">
              {e.sets.map((s) => (
                <div
                  key={s.setNumber}
                  className={
                    "grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_32px_32px] items-center gap-1.5 rounded-2xl border p-1.5 min-[380px]:grid-cols-[28px_1fr_1fr_36px_36px] min-[380px]:gap-2 min-[380px]:p-2 " +
                    (s.completed
                      ? "bg-neon/10 border-neon/30"
                      : "bg-white/[0.03] border-white/[0.05]")
                  }
                >
                  <div className="text-center text-[11px] font-bold tabular-nums">
                    {s.setNumber}
                    {s.isExtraSet && <div className="text-[8px] text-neon">+1</div>}
                  </div>
                  <NumberInput
                    value={s.actualReps}
                    step={1}
                    onChange={(v) => updateSet(e.id, s.setNumber, { actualReps: Math.max(0, v) })}
                  />
                  <NumberInput
                    value={s.weight}
                    step={weightStep}
                    decimals
                    onChange={(v) => updateSet(e.id, s.setNumber, { weight: Math.max(0, v) })}
                  />
                  <button
                    onClick={() => updateSet(e.id, s.setNumber, { completed: !s.completed })}
                    className={
                      "size-9 rounded-xl grid place-items-center " +
                      (s.completed
                        ? "bg-neon text-neon-foreground"
                        : "bg-white/[0.04] text-muted-foreground")
                    }
                    aria-label="Toggle completed"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => removeSet(e.id, s.setNumber)}
                    className="size-9 rounded-xl grid place-items-center bg-red-500/10 text-red-300"
                    aria-label="Delete set"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(e.id)}
              className="mt-2 w-full h-10 rounded-2xl border border-dashed border-white/15 text-[12px] font-semibold flex items-center justify-center gap-1.5 text-muted-foreground"
            >
              <Plus className="size-4" /> Add missed set
            </button>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-3xl border border-white/[0.05] bg-surface p-4 sm:mx-5">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="size-4 text-neon" />
          <div className="text-sm font-bold">Workout notes</div>
        </div>
        <textarea
          value={draft.notes ?? ""}
          onChange={(e) => {
            setDraft((d) => ({ ...d, notes: e.target.value }));
            setDirty(true);
          }}
          placeholder="How did it feel? Anything to remember next time?"
          maxLength={500}
          rows={3}
          className="w-full bg-background/60 rounded-2xl p-3 text-sm outline-none resize-none"
        />
      </div>

      <div className="mt-6 flex flex-col gap-2 px-4 sm:px-5">
        <button
          onClick={save}
          disabled={!dirty}
          className="w-full h-14 rounded-full bg-neon text-neon-foreground font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Save className="size-5" /> {dirty ? "Save changes" : "Saved"}
        </button>
        <button
          onClick={onDelete}
          className="w-full h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] font-semibold flex items-center justify-center gap-1.5"
        >
          <Trash2 className="size-4" /> Delete workout
        </button>
      </div>
    </div>
  );
}

function NumberInput({
  value,
  step,
  decimals,
  onChange,
}: {
  value: number;
  step: number;
  decimals?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center bg-background/60 rounded-xl h-10 px-1">
      <button
        onClick={() => onChange(Math.round((value - step) * 10) / 10)}
        className="size-7 grid place-items-center rounded-lg text-muted-foreground"
        aria-label="Decrease"
      >
        <Minus className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode={decimals ? "decimal" : "numeric"}
        value={value || ""}
        onChange={(e) =>
          onChange(decimals ? parseFloat(e.target.value) || 0 : parseInt(e.target.value || "0", 10))
        }
        className="flex-1 bg-transparent outline-none text-center text-sm font-bold tabular-nums w-full"
      />
      <button
        onClick={() => onChange(Math.round((value + step) * 10) / 10)}
        className="size-7 grid place-items-center rounded-lg text-muted-foreground"
        aria-label="Increase"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.05] bg-surface p-2.5 text-center sm:p-3">
      <div className="text-base font-extrabold tabular-nums">{value}</div>
      <div className="flex items-center justify-center gap-1 truncate text-[9px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
    </div>
  );
}
