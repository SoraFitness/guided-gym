import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Dumbbell, Flame, Sparkles, Zap, Home, Building2 } from "lucide-react";
import { AnimatedAthlete } from "@/components/AnimatedAthlete";
import { useProfile, type Profile, type Goal, type Gender, type Location } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get Started — Pulse" },
      { name: "description", content: "Tell us about you and get a personalized training plan." },
    ],
  }),
  component: Onboarding,
});

const goals: { id: Goal; label: string; icon: typeof Dumbbell; tint: string }[] = [
  { id: "muscle", label: "Gain muscle", icon: Dumbbell, tint: "from-neon to-emerald-300" },
  { id: "lose", label: "Lose weight", icon: Flame, tint: "from-orange-400 to-rose-500" },
  { id: "recomp", label: "Body recomposition", icon: Sparkles, tint: "from-sky-400 to-indigo-500" },
  { id: "energy", label: "Increase energy", icon: Zap, tint: "from-yellow-300 to-amber-500" },
];

const equipmentChoices = ["Bodyweight", "Dumbbells", "Resistance bands", "Kettlebells", "Pull-up bar", "Full gym"];
const dietChoices = ["No preference", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Halal"];

interface Draft extends Partial<Profile> {
  equipment: string[];
}

function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [d, setD] = useState<Draft>({
    name: "",
    age: 25,
    gender: "female",
    heightCm: 170,
    weightKg: 70,
    goal: "muscle",
    activityLevel: 3,
    location: "home",
    equipment: ["Bodyweight"],
    diet: "No preference",
    injuries: "",
  });

  const TOTAL = 8;
  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const canNext = () => {
    if (step === 1) return !!d.name && d.name.trim().length >= 2;
    return true;
  };

  const next = () => {
    if (step === TOTAL - 1) return finish();
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    setGenerating(true);
    setTimeout(() => {
      const profile: Profile = {
        name: d.name!.trim(),
        age: d.age!,
        gender: d.gender!,
        heightCm: d.heightCm!,
        weightKg: d.weightKg!,
        goal: d.goal!,
        activityLevel: d.activityLevel!,
        location: d.location!,
        equipment: d.equipment,
        diet: d.diet ?? "",
        injuries: d.injuries ?? "",
        completedAt: new Date().toISOString(),
      };
      setProfile(profile);
      navigate({ to: "/home" });
    }, 2200);
  };

  if (generating) {
    return (
      <div className="min-h-dvh bg-background grid place-items-center px-6 text-center">
        <div className="animate-slide-up">
          <AnimatedAthlete size={260} className="mx-auto" />
          <h2 className="mt-8 text-2xl font-bold">Building your plan</h2>
          <p className="mt-2 text-muted-foreground">Tailoring workouts to your goals…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-5 pt-6">
        {step > 0 ? (
          <button
            onClick={back}
            className="size-10 grid place-items-center rounded-full bg-surface text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : (
          <div className="size-10" />
        )}
        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full bg-neon transition-all duration-500"
            style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {step + 1}/{TOTAL}
        </span>
      </header>

      <main className="flex-1 px-6 pt-8 pb-32 overflow-y-auto">
        <div key={step} className="animate-slide-up">
          {step === 0 && <Welcome />}
          {step === 1 && (
            <Basics
              name={d.name ?? ""}
              age={d.age ?? 25}
              gender={d.gender ?? "female"}
              onChange={(p) => setD((prev) => ({ ...prev, ...p }))}
            />
          )}
          {step === 2 && (
            <Body
              heightCm={d.heightCm ?? 170}
              weightKg={d.weightKg ?? 70}
              onChange={(p) => setD((prev) => ({ ...prev, ...p }))}
            />
          )}
          {step === 3 && <GoalStep value={d.goal!} onChange={(g) => update("goal", g)} />}
          {step === 4 && (
            <ActivityStep value={d.activityLevel!} onChange={(n) => update("activityLevel", n)} />
          )}
          {step === 5 && (
            <LocationStep
              location={d.location!}
              equipment={d.equipment}
              onLocation={(l) => update("location", l)}
              onEquipment={(e) => update("equipment", e)}
            />
          )}
          {step === 6 && (
            <DietStep
              diet={d.diet ?? ""}
              injuries={d.injuries ?? ""}
              onDiet={(v) => update("diet", v)}
              onInjuries={(v) => update("injuries", v)}
            />
          )}
          {step === 7 && <Review d={d} />}
        </div>
      </main>

      <footer className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          disabled={!canNext()}
          onClick={next}
          className={cn(
            "w-full h-14 rounded-full font-semibold text-base flex items-center justify-center gap-2 transition",
            canNext()
              ? "bg-neon text-neon-foreground glow-neon active:scale-[0.98]"
              : "bg-surface text-muted-foreground"
          )}
        >
          {step === TOTAL - 1 ? "Start training" : "Continue"}
          <ArrowRight className="size-5" />
        </button>
      </footer>
    </div>
  );
}

function Welcome() {
  return (
    <div className="text-center pt-4">
      <AnimatedAthlete size={280} className="mx-auto" />
      <h1 className="mt-8 text-[34px] leading-tight font-extrabold text-balance">
        Wherever you are,<br />
        <span className="text-neon">health is number one</span>
      </h1>
      <p className="mt-3 text-muted-foreground text-balance">
        There's no instant way to a healthy life. Let's build yours, one rep at a time.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const input = "w-full h-14 rounded-2xl bg-surface px-4 text-foreground placeholder:text-muted-foreground border border-border focus:border-neon focus:outline-none";

function Basics({
  name, age, gender, onChange,
}: { name: string; age: number; gender: Gender; onChange: (p: Partial<Draft>) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Tell us about you</h2>
      <Field label="What should we call you?">
        <input
          className={input}
          placeholder="Your name"
          value={name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={40}
        />
      </Field>
      <Field label={`Age — ${age}`}>
        <input
          type="range" min={14} max={80} value={age}
          onChange={(e) => onChange({ age: Number(e.target.value) })}
          className="w-full accent-[var(--color-neon)]"
        />
      </Field>
      <Field label="Gender">
        <div className="grid grid-cols-3 gap-2">
          {(["female", "male", "other"] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => onChange({ gender: g })}
              className={cn(
                "h-12 rounded-2xl capitalize text-sm font-medium border transition",
                gender === g
                  ? "bg-neon text-neon-foreground border-neon"
                  : "bg-surface border-border text-foreground"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Body({
  heightCm, weightKg, onChange,
}: { heightCm: number; weightKg: number; onChange: (p: Partial<Draft>) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Your measurements</h2>
      <Field label={`Height — ${heightCm} cm`}>
        <input
          type="range" min={140} max={220} value={heightCm}
          onChange={(e) => onChange({ heightCm: Number(e.target.value) })}
          className="w-full accent-[var(--color-neon)]"
        />
      </Field>
      <Field label={`Weight — ${weightKg} kg`}>
        <input
          type="range" min={40} max={180} value={weightKg}
          onChange={(e) => onChange({ weightKg: Number(e.target.value) })}
          className="w-full accent-[var(--color-neon)]"
        />
      </Field>
      <div className="rounded-2xl bg-surface p-4 text-sm text-muted-foreground">
        We use this to calibrate calorie estimates and intensity. You can update it anytime in your profile.
      </div>
    </div>
  );
}

function GoalStep({ value, onChange }: { value: Goal; onChange: (g: Goal) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">What's your goal?</h2>
      <p className="text-muted-foreground -mt-3">Pick the one that matters most right now.</p>
      <div className="space-y-3">
        {goals.map(({ id, label, icon: Icon, tint }) => {
          const active = value === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "w-full h-16 rounded-2xl flex items-center gap-4 px-4 text-left border transition",
                active ? "bg-surface-2 border-neon glow-neon" : "bg-surface border-border"
              )}
            >
              <span className={cn("size-10 rounded-xl grid place-items-center bg-gradient-to-br", tint)}>
                <Icon className="size-5 text-black" />
              </span>
              <span className="flex-1 font-semibold">{label}</span>
              <span
                className={cn(
                  "size-6 rounded-md border-2",
                  active ? "border-neon bg-neon" : "border-border"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActivityStep({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const labels = ["Sedentary", "Lightly active", "Active", "Very active", "Athlete"];
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">How active are you?</h2>
      <div className="rounded-3xl bg-surface p-6">
        <div className="text-center text-4xl font-extrabold text-neon">{labels[value - 1]}</div>
        <input
          type="range" min={1} max={5} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full mt-6 accent-[var(--color-neon)]"
        />
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span>Sedentary</span>
          <span>Athlete</span>
        </div>
      </div>
    </div>
  );
}

function LocationStep({
  location, equipment, onLocation, onEquipment,
}: {
  location: Location; equipment: string[];
  onLocation: (l: Location) => void; onEquipment: (e: string[]) => void;
}) {
  const toggle = (item: string) =>
    onEquipment(equipment.includes(item) ? equipment.filter((x) => x !== item) : [...equipment, item]);
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Where do you train?</h2>
      <div className="grid grid-cols-2 gap-3">
        {([["home", Home, "At home"], ["gym", Building2, "At the gym"]] as const).map(([id, Icon, label]) => {
          const active = location === id;
          return (
            <button
              key={id}
              onClick={() => onLocation(id)}
              className={cn(
                "h-28 rounded-2xl flex flex-col items-center justify-center gap-2 border transition",
                active ? "bg-surface-2 border-neon glow-neon" : "bg-surface border-border"
              )}
            >
              <Icon className={cn("size-7", active ? "text-neon" : "text-muted-foreground")} />
              <span className="font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-3">Available equipment</div>
        <div className="flex flex-wrap gap-2">
          {equipmentChoices.map((e) => {
            const active = equipment.includes(e);
            return (
              <button
                key={e}
                onClick={() => toggle(e)}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-medium border transition",
                  active
                    ? "bg-neon text-neon-foreground border-neon"
                    : "bg-surface text-foreground border-border"
                )}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DietStep({
  diet, injuries, onDiet, onInjuries,
}: { diet: string; injuries: string; onDiet: (v: string) => void; onInjuries: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">A few last things</h2>
      <div>
        <div className="text-sm text-muted-foreground mb-3">Dietary preference</div>
        <div className="flex flex-wrap gap-2">
          {dietChoices.map((d) => {
            const active = diet === d;
            return (
              <button
                key={d}
                onClick={() => onDiet(d)}
                className={cn(
                  "h-10 px-4 rounded-full text-sm font-medium border transition",
                  active
                    ? "bg-neon text-neon-foreground border-neon"
                    : "bg-surface text-foreground border-border"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Injuries or limitations (optional)">
        <textarea
          rows={3}
          maxLength={300}
          value={injuries}
          onChange={(e) => onInjuries(e.target.value)}
          placeholder="e.g. lower back sensitivity, knee issues…"
          className={cn(input, "h-auto py-3 resize-none")}
        />
      </Field>
    </div>
  );
}

function Review({ d }: { d: Draft }) {
  const row = (k: string, v: string | number | undefined) => (
    <div className="flex justify-between py-3 border-b border-border last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Ready, {d.name || "athlete"}?</h2>
      <p className="text-muted-foreground -mt-3">Here's the plan we'll personalize for you.</p>
      <div className="rounded-3xl bg-surface px-5">
        {row("Goal", goals.find((g) => g.id === d.goal)?.label)}
        {row("Body", `${d.heightCm} cm · ${d.weightKg} kg`)}
        {row("Activity", `Level ${d.activityLevel}/5`)}
        {row("Train at", d.location === "home" ? "Home" : "Gym")}
        {row("Equipment", d.equipment.join(", ") || "—")}
        {row("Diet", d.diet || "—")}
      </div>
    </div>
  );
}
