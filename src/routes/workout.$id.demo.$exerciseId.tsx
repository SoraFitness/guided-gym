import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle, Lightbulb, Target, ShieldCheck } from "lucide-react";
import { getWorkout, type Workout } from "@/lib/workouts";
import { useProfile } from "@/lib/profile";
import { Exercise3DViewer } from "@/components/exercise3d/Exercise3DViewer";
import { detectAnimation, getCoaching } from "@/lib/exerciseCoaching";
import type { AvatarGender } from "@/components/exercise3d/AvatarModel";

export const Route = createFileRoute("/workout/$id/demo/$exerciseId")({
  head: ({ params }) => {
    const w = getWorkout(params.id);
    const ex = w?.exercises.find((e) => e.id === params.exerciseId);
    return { meta: [{ title: `${ex?.name ?? "Exercise"} — 3D demo` }] };
  },
  loader: ({ params }) => {
    const w = getWorkout(params.id);
    if (!w) throw notFound();
    const ex = w.exercises.find((e) => e.id === params.exerciseId);
    if (!ex) throw notFound();
    return { w, ex };
  },
  component: DemoPage,
});

function toAvatar(g?: string): AvatarGender {
  if (g === "male" || g === "female") return g;
  return "neutral";
}

function DemoPage() {
  const { w, ex } = Route.useLoaderData() as {
    w: Workout;
    ex: Workout["exercises"][number];
  };
  const { profile } = useProfile();
  const anim = detectAnimation(ex.name, ex.demoType);
  const coaching = getCoaching(anim, profile?.experience, profile?.goal);
  const speed = profile?.experience === "beginner" ? 0.7 : 1;

  return (
    <div className="min-h-dvh bg-background pb-20">
      <div className="px-5 pt-5 flex items-center gap-3">
        <Link
          to="/workout/$id"
          params={{ id: w.id }}
          className="size-10 rounded-full bg-white/[0.06] grid place-items-center"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-muted-foreground">3D demo</div>
          <h1 className="font-bold truncate">{ex.name}</h1>
        </div>
      </div>

      <div className="px-5 mt-4">
        <Exercise3DViewer animation={anim} gender={toAvatar(profile?.gender)} defaultSpeed={speed} />
      </div>

      <div className="px-5 mt-5 grid gap-3">
        <Card icon={<Lightbulb className="size-4 text-neon" />} title="Form tips">
          <ul className="space-y-1.5 text-sm">
            {coaching.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="text-neon">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card icon={<AlertTriangle className="size-4 text-amber-300" />} title="Common mistakes">
          <ul className="space-y-1.5 text-sm">
            {coaching.mistakes.map((m) => (
              <li key={m} className="flex gap-2">
                <span className="text-amber-300">×</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card icon={<Target className="size-4 text-rose-300" />} title="Target muscles">
          <div className="flex flex-wrap gap-1.5">
            {coaching.muscles.map((m) => (
              <span
                key={m}
                className="px-2.5 py-1 rounded-full bg-white/[0.06] text-[11px] font-semibold"
              >
                {m}
              </span>
            ))}
          </div>
        </Card>
        <Card icon={<ShieldCheck className="size-4 text-emerald-300" />} title="Safety">
          <p className="text-sm text-muted-foreground">
            This demo is for fitness education only. Warm up first, move with control, and stop if you
            feel pain.
          </p>
        </Card>
      </div>

      <div className="px-5 mt-6">
        <Link
          to="/workout/$id/session"
          params={{ id: w.id }}
          className="block w-full h-13 py-4 rounded-full bg-neon text-neon-foreground font-semibold text-center glow-neon active:scale-[0.98] transition"
        >
          Start workout
        </Link>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-surface border border-white/[0.05] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h2 className="font-bold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}
