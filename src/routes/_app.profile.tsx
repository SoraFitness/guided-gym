import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LogOut, Settings, ChevronRight, Target, Dumbbell, Apple, Flame, Sparkles, Check,
  BarChart3, ScanLine, Compass, Camera, type LucideIcon,
} from "lucide-react";

import {
  useProfile, GOAL_LABELS, GOAL_OPTIONS, EQUIPMENT_LABELS, EQUIPMENT_OPTIONS,
  EXPERIENCE_LABELS, deriveEquipmentSetup,
} from "@/lib/profile";
import { loadGoals, type NutritionGoals } from "@/lib/foods";
import { setNutritionGoals } from "@/lib/nutritionStore";
import { suggestNutrition } from "@/lib/nutritionService";
import { resetTour } from "@/lib/tourStore";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Pulse" }] }),
  component: ProfilePage,
});

type SheetKind = null | "goal" | "equipment" | "injuries";

function ProfilePage() {
  const { profile, setProfile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const [goals, setGoalsState] = useState<NutritionGoals>(loadGoals());
  const [saved, setSaved] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetKind>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!profile) return null;

  const equipmentItems = profile.equipmentItems?.length
    ? profile.equipmentItems
    : [EQUIPMENT_LABELS[profile.equipment]];

  const doReset = () => {
    setProfile(null);
    resetTour();
    setConfirmReset(false);
    navigate({ to: "/onboarding" });
  };

  const restartTour = () => {
    resetTour();
    navigate({ to: "/home" });
  };

  const update = (k: keyof NutritionGoals, v: string) => {
    setGoalsState({ ...goals, [k]: Number(v.replace(/[^0-9]/g, "")) || 0 });
    setSaved(false);
  };
  const save = () => {
    setNutritionGoals(goals);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  const suggest = () => {
    setGoalsState(suggestNutrition(profile));
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

      <section data-tour="tour-profile-settings" className="mt-6 rounded-3xl bg-surface divide-y divide-border overflow-hidden">
        <Link to="/progress" className="block active:bg-white/[0.03]">
          <RowContent icon={BarChart3} label="Progress" value="View workouts & streaks" />
        </Link>
        <Link to="/photos" className="block active:bg-white/[0.03]">
          <RowContent icon={Camera} label="Progress Pictures" value="Private transformation gallery" />
        </Link>
        <Link to="/scan/body" className="block active:bg-white/[0.03]">
          <RowContent icon={ScanLine} label="Body Scan history" value="Track your physique over time" />
        </Link>

        <button type="button" onClick={restartTour} className="block w-full text-left active:bg-white/[0.03]">
          <RowContent icon={Compass} label="App tour" value="Restart the guided walkthrough" />
        </button>
        <button type="button" onClick={() => setOpenSheet("goal")} className="block w-full text-left active:bg-white/[0.03]">
          <RowContent icon={Target} label="Goal" value={GOAL_LABELS[profile.goal]} />
        </button>
        <button type="button" onClick={() => setOpenSheet("equipment")} className="block w-full text-left active:bg-white/[0.03]">
          <RowContent icon={Dumbbell} label="Equipment" value={equipmentItems.join(", ")} />
        </button>
        <button type="button" onClick={() => setOpenSheet("injuries")} className="block w-full text-left active:bg-white/[0.03]">
          <RowContent icon={Apple} label="Injuries / notes" value={profile.injuries?.trim() ? profile.injuries.split("\n")[0] : "Add notes"} />
        </button>
      </section>

      <button
        onClick={() => setConfirmReset(true)}
        className="mt-6 w-full h-14 rounded-full bg-surface border border-border flex items-center justify-center gap-2 text-destructive font-medium"
      >
        <LogOut className="size-5" />
        Reset profile
      </button>

      {/* Goal sheet */}
      <Sheet open={openSheet === "goal"} onOpenChange={(o) => !o && setOpenSheet(null)}>
        <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Choose your goal</SheetTitle>
            <SheetDescription>Used to personalize your workouts and nutrition.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => {
                  updateProfile({ goal: g });
                  setOpenSheet(null);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 h-14 rounded-2xl border text-left",
                  profile.goal === g
                    ? "border-neon bg-neon/10 text-foreground"
                    : "border-border bg-surface text-foreground/90",
                )}
              >
                <span className="font-medium">{GOAL_LABELS[g]}</span>
                {profile.goal === g && <Check className="size-5 text-neon" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Equipment sheet */}
      <EquipmentSheet
        open={openSheet === "equipment"}
        initial={equipmentItems}
        onClose={() => setOpenSheet(null)}
        onSave={(items) => {
          updateProfile({ equipmentItems: items, equipment: deriveEquipmentSetup(items) });
          setOpenSheet(null);
        }}
      />

      {/* Injuries sheet */}
      <InjuriesSheet
        open={openSheet === "injuries"}
        initial={profile.injuries ?? ""}
        onClose={() => setOpenSheet(null)}
        onSave={(text) => {
          updateProfile({ injuries: text });
          setOpenSheet(null);
        }}
      />

      {/* Reset confirm */}
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset your profile? This will clear your goal, equipment, injuries, onboarding answers, and app preferences.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EquipmentSheet({
  open, initial, onClose, onSave,
}: { open: boolean; initial: string[]; onClose: () => void; onSave: (items: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(initial);


  const toggle = (item: string) => {
    setSelected((cur) => {
      if (item === "No equipment") return ["No equipment"];
      const without = cur.filter((i) => i !== "No equipment");
      return without.includes(item) ? without.filter((i) => i !== item) : [...without, item];
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl max-h-[85dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Your equipment</SheetTitle>
          <SheetDescription>Pick everything you have. We'll use it to build your workouts.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((item) => {
            const on = selected.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggle(item)}
                className={cn(
                  "h-14 px-3 rounded-2xl border text-sm font-medium flex items-center justify-between text-left",
                  on ? "border-neon bg-neon/10" : "border-border bg-surface",
                )}
              >
                <span className="truncate">{item}</span>
                {on && <Check className="size-4 text-neon shrink-0" />}
              </button>
            );
          })}
        </div>
        <SheetFooter className="mt-5">
          <button
            onClick={() => onSave(selected.length ? selected : ["No equipment"])}
            className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Save
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InjuriesSheet({
  open, initial, onClose, onSave,
}: { open: boolean; initial: string; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Injuries & notes</SheetTitle>
          <SheetDescription>
            Add anything we should know — injuries, limitations, exercises to avoid.
          </SheetDescription>
        </SheetHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"e.g. Bad knees\nAvoid shoulder press\nNo jumping exercises"}
          className="mt-4 min-h-32 bg-surface border-border"
        />
        <SheetFooter className="mt-4">
          <button
            onClick={() => onSave(text.trim())}
            className="w-full h-12 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Save notes
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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

function RowContent({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="w-full flex items-center gap-4 p-4">
      <span className="size-10 rounded-xl bg-surface-2 grid place-items-center shrink-0">
        <Icon className="size-5 text-neon" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
      </div>
      <ChevronRight className="size-5 text-muted-foreground shrink-0" />
    </div>
  );
}
