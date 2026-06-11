import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, Settings, ChevronRight, Target, Dumbbell, Apple, Flame, Sparkles, Check } from "lucide-react";
import { useProfile, GOAL_LABELS, EQUIPMENT_LABELS, EXPERIENCE_LABELS } from "@/lib/profile";
import { loadGoals, suggestGoals, type NutritionGoals } from "@/lib/foods";
import { setNutritionGoals } from "@/lib/nutritionStore";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Pulse" }] }),
  component: ProfilePage,
});


function ProfilePage() {
  const { profile, setProfile } = useProfile();
  const navigate = useNavigate();
  const [goals, setGoalsState] = useState<NutritionGoals>(loadGoals());
  const [saved, setSaved] = useState(false);
  if (!profile) return null;

  const reset = () => {
    if (confirm("Reset your profile and start over?")) {
      setProfile(null);
      navigate({ to: "/onboarding" });
    }
  };

  const update = (k: keyof NutritionGoals, v: string) => {
    setGoalsState({ ...goals, [k]: Number(v.replace(/[^0-9]/g, "")) || 0 });
    setSaved(false);
  };
  const save = () => {
    saveGoals(goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const suggest = () => {
    setGoalsState(suggestGoals(profile.currentWeightKg));
    setSaved(false);
  };

  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <button className="size-10 rounded-full bg-surface grid place-items-center">
          <Settings className="size-5" />
        </button>
      </header>

      <section className="mt-6 rounded-3xl bg-surface p-5 flex items-center gap-4">
        <div className="size-16 rounded-full bg-gradient-to-br from-neon to-emerald-400 grid place-items-center text-2xl font-extrabold text-neon-foreground">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">
            {profile.age} yrs · {profile.heightCm} cm · {profile.currentWeightKg} kg
          </p>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-3">
        <Mini label="Goal" value={GOAL_LABELS[profile.goal].split(" ")[0]} />
        <Mini label="Level" value={EXPERIENCE_LABELS[profile.experience]} />
        <Mini label="Trains" value={profile.equipment === "gym" ? "Gym" : profile.equipment === "none" ? "Home" : "Mixed"} />
      </section>

      {/* Nutrition Goals */}
      <section className="mt-6 rounded-[28px] bg-white/[0.03] border border-white/[0.05] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-neon" />
            <h3 className="font-bold">Nutrition Goals</h3>
          </div>
          <button onClick={suggest} className="text-[11px] font-semibold text-neon flex items-center gap-1">
            <Sparkles className="size-3" /> Suggest
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Daily targets used across the Nutrition tab.</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <GoalField label="Calories" suffix="kcal" value={goals.kcal} onChange={(v) => update("kcal", v)} />
          <GoalField label="Protein" suffix="g" value={goals.protein} onChange={(v) => update("protein", v)} />
          <GoalField label="Carbs" suffix="g" value={goals.carbs} onChange={(v) => update("carbs", v)} />
          <GoalField label="Fat" suffix="g" value={goals.fat} onChange={(v) => update("fat", v)} />
        </div>

        <button
          onClick={save}
          className="mt-4 w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold text-sm flex items-center justify-center gap-2 glow-neon active:scale-[0.98]"
        >
          {saved ? <><Check className="size-4" /> Saved</> : "Save Nutrition Goals"}
        </button>
      </section>

      <section className="mt-6 rounded-3xl bg-surface divide-y divide-border">
        <Row icon={Target} label="Goal" value={GOAL_LABELS[profile.goal]} />
        <Row icon={Dumbbell} label="Equipment" value={EQUIPMENT_LABELS[profile.equipment]} />
        <Row icon={Apple} label="Injuries / notes" value={profile.injuries || "—"} />
      </section>

      <button
        onClick={reset}
        className="mt-6 w-full h-14 rounded-full bg-surface border border-border flex items-center justify-center gap-2 text-destructive font-medium"
      >
        <LogOut className="size-5" />
        Reset profile
      </button>
    </div>
  );
}

function GoalField({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1 relative">
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 pr-12 text-base font-semibold tabular-nums outline-none focus:border-neon/40"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 text-center">
      <div className="text-sm font-bold text-neon truncate">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <button className="w-full flex items-center gap-4 p-4 text-left">
      <span className="size-10 rounded-xl bg-surface-2 grid place-items-center">
        <Icon className="size-5 text-neon" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </button>
  );
}
