import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, ChevronRight, Target, Dumbbell, Apple } from "lucide-react";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Pulse" }] }),
  component: ProfilePage,
});

const goalLabels: Record<string, string> = {
  muscle: "Gain muscle",
  lose: "Lose weight",
  recomp: "Body recomposition",
  energy: "Increase energy",
};

function ProfilePage() {
  const { profile, setProfile } = useProfile();
  const navigate = useNavigate();
  if (!profile) return null;

  const reset = () => {
    if (confirm("Reset your profile and start over?")) {
      setProfile(null);
      navigate({ to: "/onboarding" });
    }
  };

  return (
    <div className="px-5 pt-6 animate-slide-up">
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
            {profile.age} yrs · {profile.heightCm} cm · {profile.weightKg} kg
          </p>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-3">
        <Mini label="Goal" value={goalLabels[profile.goal]?.split(" ")[0] ?? "—"} />
        <Mini label="Level" value={`${profile.activityLevel}/5`} />
        <Mini label="Trains at" value={profile.location === "home" ? "Home" : "Gym"} />
      </section>

      <section className="mt-6 rounded-3xl bg-surface divide-y divide-border">
        <Row icon={Target} label="Goal" value={goalLabels[profile.goal]} />
        <Row icon={Dumbbell} label="Equipment" value={profile.equipment.join(", ") || "—"} />
        <Row icon={Apple} label="Diet" value={profile.diet || "—"} />
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
