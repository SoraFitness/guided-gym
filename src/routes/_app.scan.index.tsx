import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  ChevronRight,
  Clock3,
  LockKeyhole,
  ScanFace,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_app/scan/")({
  head: () => ({ meta: [{ title: "Scans — Ascendr" }] }),
  component: ScanHub,
});

function ScanHub() {
  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-5 animate-slide-up sm:px-5">
      <header className="px-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon">Ascendr vision</p>
        <h1 className="mt-1 text-[29px] font-extrabold leading-[1.04] tracking-[-0.04em]">
          See what to improve next.
        </h1>
        <p className="mt-2 max-w-[38ch] text-[11px] leading-relaxed text-muted-foreground">
          Upload one clear photo and get a private visual assessment with scores, priorities, and an
          actionable improvement plan.
        </p>
      </header>

      <section className="mt-5 rounded-[24px] border border-white/[0.06] bg-surface p-3.5">
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          <ProcessStep icon={Upload} step="1" label="Upload" />
          <span className="h-px w-full bg-white/10" />
          <ProcessStep icon={Sparkles} step="2" label="Analyze" />
          <span className="h-px w-full bg-white/10" />
          <ProcessStep icon={Target} step="3" label="Improve" />
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <ScanCard
          to="/scan/face"
          icon={ScanFace}
          eyebrow="Face analysis"
          title="Face Scan"
          description="Understand facial balance, standout features, grooming opportunities, and realistic looksmax potential."
          metrics={["Overall", "Symmetry", "Potential"]}
          badge="Popular"
          accent
        />

        <ScanCard
          to="/scan/body"
          icon={ScanLine}
          eyebrow="Physique analysis"
          title="Body Scan"
          description="Review muscle-group development, proportions, body-fat range, symmetry, and realistic physique potential."
          metrics={["Physique", "9 groups", "V-taper"]}
          badge="Detailed"
          tour="tour-bodyscan"
        />
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <TrustCard
          icon={ShieldCheck}
          title="Private by default"
          detail="Photos stay in your private account."
        />
        <TrustCard
          icon={Clock3}
          title="Fast results"
          detail="Clear scores and priorities in one report."
        />
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-neon/15 bg-neon/[0.045] p-4">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-neon" />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Ascendr provides a subjective appearance and fitness opinion—not a medical assessment.
          Results can vary with lighting, angle, clothing, and image quality.
        </p>
      </div>
    </div>
  );
}

function ScanCard({
  to,
  icon: Icon,
  eyebrow,
  title,
  description,
  metrics,
  badge,
  accent = false,
  tour,
}: {
  to: "/scan/face" | "/scan/body";
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  metrics: string[];
  badge: string;
  accent?: boolean;
  tour?: string;
}) {
  return (
    <Link
      to={to}
      data-tour={tour}
      className="group relative block min-h-[248px] overflow-hidden rounded-[28px] border border-white/[0.075] bg-surface p-5 shadow-[0_24px_55px_-32px_oklch(0_0_0/0.95)] transition active:scale-[0.99]"
    >
      <div
        className={
          accent
            ? "absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,oklch(0.92_0.21_130/0.16),transparent_45%)]"
            : "absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,oklch(0.7_0.12_245/0.13),transparent_45%)]"
        }
      />
      <div className="absolute -bottom-12 -right-10 size-40 rounded-full border border-white/[0.035]" />
      <div className="absolute -bottom-5 right-4 size-24 rounded-full border border-white/[0.04]" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.05] text-neon">
            <Icon className="size-6" />
          </span>
          <span className="rounded-full border border-neon/20 bg-neon/10 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.14em] text-neon">
            {badge}
          </span>
        </div>
        <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-neon">{eyebrow}</p>
        <h2 className="mt-1 text-[24px] font-extrabold tracking-[-0.03em]">{title}</h2>
        <p className="mt-2 max-w-[38ch] text-[11px] leading-relaxed text-white/60">{description}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <span
              key={metric}
              className="rounded-xl border border-white/[0.055] bg-black/20 px-2 py-2 text-center text-[8px] font-semibold uppercase tracking-wide text-white/65"
            >
              {metric}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold">
            <Camera className="size-3.5 text-neon" /> Upload a photo
          </span>
          <span className="grid size-9 place-items-center rounded-full bg-neon text-neon-foreground transition group-active:translate-x-0.5">
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProcessStep({
  icon: Icon,
  step,
  label,
}: {
  icon: LucideIcon;
  step: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <span className="grid size-8 place-items-center rounded-xl bg-neon/10 text-neon">
        <Icon className="size-3.5" />
      </span>
      <span className="mt-1.5 truncate text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
        {step}. {label}
      </span>
    </div>
  );
}

function TrustCard({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.055] bg-white/[0.025] p-3.5">
      <Icon className="size-4 text-neon" />
      <h3 className="mt-3 text-[11px] font-bold">{title}</h3>
      <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
