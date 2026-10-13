import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  ChartSpline,
  LockKeyhole,
  ScanFace,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  AscentMark,
  cardClass,
  DeltaBadge,
  Page,
  PageHeader,
  scoreColor,
  SectionHeader,
} from "@/components/app/kit";
import { TrendChart } from "@/components/app/charts";
import { scanTrendPoints, useScanHistory } from "@/components/scans/useScanHistory";
import { BODY_SCAN_DEMO_PHOTO, BODY_SCAN_DEMO_RESULT } from "@/lib/bodyScanDemo";
import { FACE_SCAN_DEMO_PHOTO, FACE_SCAN_DEMO_RESULT } from "@/lib/faceScanDemo";
import type { ScanSubmissionSummary } from "@/lib/scanSubmissions.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/scan/")({
  head: () => ({ meta: [{ title: "Scans — Ascendr" }] }),
  component: ScanHub,
});

function ScanHub() {
  const body = useScanHistory("body");
  const face = useScanHistory("face");

  return (
    <Page className="pb-32">
      <PageHeader kicker="AI vision" title="Scan" />

      <div className="mt-5 space-y-3">
        <ScanTile
          kind="body"
          items={body.data}
          tour="tour-bodyscan"
          title="Body Scan"
          detail="Physique score, muscle map, body fat"
        />
        <ScanTile
          kind="face"
          items={face.data}
          title="Face Scan"
          detail="Appearance score, features, potential"
        />
      </div>

      <SectionHeader className="mt-8" title="How it works" />
      <div className={cn(cardClass, "grid grid-cols-3 gap-2 p-4")}>
        <Step icon={Camera} label="Snap one photo" />
        <Step icon={Sparkles} label="AI scores it" />
        <Step icon={ChartSpline} label="Track progress" />
      </div>

      <div className="mt-5 flex items-start gap-3 px-1">
        <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Photos stay in your private account. Scores are a subjective visual opinion, not a medical
          assessment, and vary with light, angle and image quality.
        </p>
      </div>
    </Page>
  );
}

function ScanTile({
  kind,
  items,
  title,
  detail,
  tour,
}: {
  kind: "body" | "face";
  items?: ScanSubmissionSummary[];
  title: string;
  detail: string;
  tour?: string;
}) {
  const latest = items?.[0];
  const previous = items?.[1];
  const sample = kind === "body" ? BODY_SCAN_DEMO_RESULT : FACE_SCAN_DEMO_RESULT;
  const photo = latest?.photoUrl ?? (kind === "body" ? BODY_SCAN_DEMO_PHOTO : FACE_SCAN_DEMO_PHOTO);
  const score = latest?.overallScore ?? sample.overallScore;
  const trend = scanTrendPoints(items, 6);
  const Icon = kind === "body" ? ScanLine : ScanFace;

  return (
    <Link
      to={kind === "body" ? "/scan/body" : "/scan/face"}
      data-tour={tour}
      className="chamfer contour-texture relative flex min-h-[214px] overflow-hidden rounded-[24px] bg-surface shadow-[inset_0_0_0_1px_var(--hairline)] transition active:scale-[0.99]"
      style={{ ["--chamfer" as string]: "26px" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 z-10 h-[3px] origin-top-left bg-neon"
        style={{
          left: "calc(100% - 26px)",
          width: 26 * Math.SQRT2,
          transform: "rotate(45deg) translateY(-1.5px)",
        }}
      />
      <div className="relative w-[44%] shrink-0 overflow-hidden bg-black">
        <img
          src={photo}
          alt=""
          className={cn(
            "absolute inset-0 size-full",
            kind === "body" ? "object-cover object-top" : "object-cover object-center",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
        <span className="font-data absolute left-3 top-3 inline-flex items-center gap-1 rounded-[7px] bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neon backdrop-blur-md">
          <AscentMark className="size-1.5" /> {latest ? "Latest" : "Sample"}
        </span>
        <p className="absolute bottom-3 left-3 flex items-baseline gap-0.5">
          <span
            className="text-[44px] font-bold leading-none tracking-[-0.04em]"
            style={{ color: scoreColor(score) }}
          >
            {score}
          </span>
          <span className="text-[14px] font-semibold text-white/80">/100</span>
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="grid size-9 place-items-center rounded-[12px] bg-neon/12 text-neon">
            <Icon className="size-[18px]" />
          </span>
          {latest && previous ? (
            <DeltaBadge value={latest.overallScore - previous.overallScore} />
          ) : null}
        </div>
        <h2 className="mt-3 text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{detail}</p>
        {trend.length >= 2 ? (
          <TrendChart points={trend} height={92} className="-mx-1 mt-2" />
        ) : (
          <p className="mt-2 text-[12px] text-muted-foreground">
            {latest
              ? `Last scan ${new Date(latest.analyzedAt ?? latest.createdAt).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" },
                )}`
              : "Get your first score"}
          </p>
        )}
        <span className="font-data mt-auto inline-flex items-center gap-1.5 pt-3 text-[13px] font-semibold uppercase text-neon">
          {latest ? "Scan again" : "Start scan"} <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function Step({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid size-11 place-items-center rounded-[14px] bg-white/[0.06] text-neon">
        <Icon className="size-5" />
      </span>
      <span className="mt-2 text-[12px] font-semibold leading-tight">{label}</span>
    </div>
  );
}
