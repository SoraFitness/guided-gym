import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Dumbbell,
  ShieldCheck,
  Target,
  Wind,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Exercise3DViewer } from "@/components/exercise3d/Exercise3DViewer";
import { getExerciseAnimationConfig } from "@/components/exercise3d/exerciseSceneConfig";
import { resolveDemoModelGender } from "@/lib/demoModel";
import {
  getExerciseDemoInfo,
  MUSCLE_LABELS,
  type ExerciseDemoInfo,
  type MuscleKey,
} from "@/lib/exerciseCoaching";
import { useProfile } from "@/lib/profile";
import { getWorkout, type Workout } from "@/lib/workouts";

export const Route = createFileRoute("/workout/$id/demo/$exerciseId")({
  head: ({ params }) => {
    const w = getWorkout(params.id);
    const ex = w?.exercises.find((e) => e.id === params.exerciseId);
    return { meta: [{ title: `${ex?.name ?? "Exercise"} - 3D demo` }] };
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

function DemoPage() {
  const { w, ex } = Route.useLoaderData() as {
    w: Workout;
    ex: Workout["exercises"][number];
  };
  const { profile } = useProfile();
  const demo = getExerciseDemoInfo(ex, profile?.experience, profile?.goal);
  const scene = useMemo(
    () =>
      getExerciseAnimationConfig({
        exerciseId: ex.id,
        animation: demo.animation,
        equipment: demo.equipment,
        name: ex.name,
      }),
    [demo.animation, demo.equipment, ex.id, ex.name],
  );
  const speed = profile?.experience === "beginner" ? 0.5 : 1;

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#030405] text-white pb-safe">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pt-safe">
        <header className="flex shrink-0 items-center gap-3 py-4">
          <Link
            to="/workout/$id"
            params={{ id: w.id }}
            className="grid size-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.06] text-white shadow-lg shadow-black/20"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neon">
              3D demo
            </div>
            <h1 className="truncate text-xl font-extrabold leading-tight">{ex.name}</h1>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-3 pb-5">
          <Exercise3DViewer
            animation={demo.animation}
            gender={resolveDemoModelGender(profile)}
            defaultSpeed={speed}
            label={ex.name}
            exerciseId={ex.id}
            primaryMuscles={demo.primaryMuscles}
            secondaryMuscles={demo.secondaryMuscles}
            equipment={demo.equipment}
            className="h-[clamp(430px,58dvh,620px)] min-h-[430px]"
          />

          <section className="grid grid-cols-2 gap-2">
            <MetricTile
              icon={Dumbbell}
              label="Setup"
              value={scene.setup.posture}
              detail={scene.setup.description}
            />
            <MetricTile
              icon={Wind}
              label="Tempo"
              value={scene.tempo.label}
              detail={`${scene.tempo.concentricSeconds}s up / ${scene.tempo.eccentricSeconds}s down`}
            />
          </section>

          <MusclePanel primary={demo.primaryMuscles} secondary={demo.secondaryMuscles} />
          <CoachingPanel demo={demo} />
        </main>
      </div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.07] bg-white/[0.045] p-3 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">
        <Icon className="size-3.5 text-neon" />
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-extrabold capitalize text-white">{value}</div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/58">{detail}</p>
    </div>
  );
}

function MusclePanel({ primary, secondary }: { primary: MuscleKey[]; secondary: MuscleKey[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-4 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-neon" />
        <h2 className="text-sm font-extrabold">Muscles trained</h2>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <MuscleRow label="Primary" muscles={primary} tone="primary" />
        <MuscleRow label="Secondary" muscles={secondary} tone="secondary" />
      </div>
    </section>
  );
}

function MuscleRow({
  label,
  muscles,
  tone,
}: {
  label: string;
  muscles: MuscleKey[];
  tone: "primary" | "secondary";
}) {
  const dot =
    tone === "primary"
      ? "bg-[#ff6245] shadow-[0_0_12px_rgba(255,98,69,0.75)]"
      : "bg-[#45aaff] shadow-[0_0_10px_rgba(69,170,255,0.65)]";

  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
          {label}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {muscles.map((muscle) => (
            <span
              key={muscle}
              className="rounded-full border border-white/[0.07] bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/78"
            >
              {MUSCLE_LABELS[muscle]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoachingPanel({ demo }: { demo: ExerciseDemoInfo }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-4 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2">
        <Dumbbell className="size-4 text-neon" />
        <h2 className="text-sm font-extrabold">{demo.trainerCue}</h2>
      </div>
      <div className="mt-4 grid gap-4">
        <GuidanceList icon={Target} title="Form" items={demo.formInstructions} />
        <GuidanceText icon={Wind} title="Breathing" text={demo.breathing} />
        <GuidanceList icon={XCircle} title="Common mistakes" items={demo.mistakes} />
        <GuidanceList icon={ShieldCheck} title="Safety" items={demo.safetyTips} />
      </div>
    </section>
  );
}

function GuidanceText({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
        <Icon className="size-3.5 text-neon" />
        {title}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-white/72">{text}</p>
    </div>
  );
}

function GuidanceList({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
        <Icon className="size-3.5 text-neon" />
        {title}
      </div>
      <ul className="mt-1 space-y-1.5 text-sm leading-relaxed text-white/72">
        {items.map((item) => (
          <li
            key={item}
            className="pl-3 before:-ml-3 before:pr-2 before:text-neon before:content-['•']"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
