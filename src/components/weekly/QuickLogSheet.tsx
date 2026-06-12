import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { quickLogWorkout, quickLogMeal, quickLogWeight, quickLogActivity } from "@/lib/weeklyReport.functions";
import { Dumbbell, Apple, Scale, Footprints } from "lucide-react";

type Kind = "workout" | "meal" | "weight" | "activity";

export function QuickLogSheet({ kind, open, onOpenChange }: { kind: Kind | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  if (!kind) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {kind === "workout" && <><Dumbbell className="size-4 text-neon" /> Log workout</>}
            {kind === "meal" && <><Apple className="size-4 text-neon" /> Log meal</>}
            {kind === "weight" && <><Scale className="size-4 text-neon" /> Log weight</>}
            {kind === "activity" && <><Footprints className="size-4 text-neon" /> Log steps & sleep</>}
          </SheetTitle>
          <SheetDescription>Quick entry — feeds your Weekly Report.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 pb-6">
          {kind === "workout" && <WorkoutForm onDone={() => onOpenChange(false)} />}
          {kind === "meal" && <MealForm onDone={() => onOpenChange(false)} />}
          {kind === "weight" && <WeightForm onDone={() => onOpenChange(false)} />}
          {kind === "activity" && <ActivityForm onDone={() => onOpenChange(false)} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["weeklyReport"] });
}

function WorkoutForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(quickLogWorkout);
  const invalidate = useInvalidate();
  const [s, set] = useState({ name: "", duration_min: 45, total_sets: 0, total_reps: 0, total_volume_kg: 0, is_pr: false, muscle_groups: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!s.name) return;
      setBusy(true);
      try {
        await fn({ data: {
          name: s.name,
          duration_min: s.duration_min,
          total_sets: s.total_sets,
          total_reps: s.total_reps,
          total_volume_kg: s.total_volume_kg,
          is_pr: s.is_pr,
          muscle_groups: s.muscle_groups.split(",").map((x) => x.trim()).filter(Boolean),
        } });
        invalidate();
        toast.success("Workout logged");
        onDone();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Input placeholder="Name (e.g. Push Day)" value={s.name} onChange={(e) => set({ ...s, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Duration (min)" value={s.duration_min || ""} onChange={(e) => set({ ...s, duration_min: +e.target.value || 0 })} />
        <Input type="number" placeholder="Sets" value={s.total_sets || ""} onChange={(e) => set({ ...s, total_sets: +e.target.value || 0 })} />
        <Input type="number" placeholder="Reps" value={s.total_reps || ""} onChange={(e) => set({ ...s, total_reps: +e.target.value || 0 })} />
        <Input type="number" placeholder="Volume (kg)" value={s.total_volume_kg || ""} onChange={(e) => set({ ...s, total_volume_kg: +e.target.value || 0 })} />
      </div>
      <Input placeholder="Muscles (chest, back, legs)" value={s.muscle_groups} onChange={(e) => set({ ...s, muscle_groups: e.target.value })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={s.is_pr} onChange={(e) => set({ ...s, is_pr: e.target.checked })} />
        Mark as PR
      </label>
      <Button disabled={busy || !s.name} className="w-full bg-neon text-neon-foreground" type="submit">{busy ? "Saving..." : "Save workout"}</Button>
    </form>
  );
}

function MealForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(quickLogMeal);
  const invalidate = useInvalidate();
  const [s, set] = useState({ name: "", meal: "snack" as const, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!s.name) return;
      setBusy(true);
      try {
        await fn({ data: s });
        invalidate();
        toast.success("Meal logged");
        onDone();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Input placeholder="Meal name" value={s.name} onChange={(e) => set({ ...s, name: e.target.value })} />
      <div className="grid grid-cols-4 gap-2">
        {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
          <button key={m} type="button" onClick={() => set({ ...s, meal: m as typeof s.meal })}
            className={"py-2 rounded-xl text-xs capitalize border " + (s.meal === m ? "bg-neon text-neon-foreground border-neon" : "border-border")}>{m}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Calories" value={s.calories || ""} onChange={(e) => set({ ...s, calories: +e.target.value || 0 })} />
        <Input type="number" placeholder="Protein (g)" value={s.protein_g || ""} onChange={(e) => set({ ...s, protein_g: +e.target.value || 0 })} />
        <Input type="number" placeholder="Carbs (g)" value={s.carbs_g || ""} onChange={(e) => set({ ...s, carbs_g: +e.target.value || 0 })} />
        <Input type="number" placeholder="Fat (g)" value={s.fat_g || ""} onChange={(e) => set({ ...s, fat_g: +e.target.value || 0 })} />
      </div>
      <Button disabled={busy || !s.name} className="w-full bg-neon text-neon-foreground" type="submit">{busy ? "Saving..." : "Save meal"}</Button>
    </form>
  );
}

function WeightForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(quickLogWeight);
  const invalidate = useInvalidate();
  const [w, setW] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const num = parseFloat(w);
      if (!num) return;
      setBusy(true);
      try {
        await fn({ data: { weight_kg: num } });
        invalidate();
        toast.success("Weight logged");
        onDone();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Input type="number" step="0.1" placeholder="Weight (kg)" value={w} onChange={(e) => setW(e.target.value)} />
      <Button disabled={busy || !w} className="w-full bg-neon text-neon-foreground" type="submit">{busy ? "Saving..." : "Save weight"}</Button>
    </form>
  );
}

function ActivityForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(quickLogActivity);
  const invalidate = useInvalidate();
  const [s, set] = useState({ steps: 0, sleep_hours: 0, recovery_score: 0 });
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        await fn({ data: s });
        invalidate();
        toast.success("Activity logged");
        onDone();
      } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
      finally { setBusy(false); }
    }} className="space-y-3">
      <Input type="number" placeholder="Steps" value={s.steps || ""} onChange={(e) => set({ ...s, steps: +e.target.value || 0 })} />
      <Input type="number" step="0.5" placeholder="Sleep (hours)" value={s.sleep_hours || ""} onChange={(e) => set({ ...s, sleep_hours: +e.target.value || 0 })} />
      <Input type="number" placeholder="Recovery score (0-100)" value={s.recovery_score || ""} onChange={(e) => set({ ...s, recovery_score: Math.min(100, +e.target.value || 0) })} />
      <Button disabled={busy} className="w-full bg-neon text-neon-foreground" type="submit">{busy ? "Saving..." : "Save activity"}</Button>
    </form>
  );
}
