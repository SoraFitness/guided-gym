import { GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScanComparisonView {
  status: "baseline" | "no_reliable_change" | "change_detected";
  direction: "improved" | "regressed" | "mixed" | "unchanged";
  summary: string;
  basis?: "baseline" | "exact_match" | "visual_comparison";
  previousScanAt?: string | null;
}

export interface ScanDeltaItem {
  label: string;
  value: number | undefined;
}

function shortDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function comparisonCopy(comparison: ScanComparisonView | undefined, scanLabel: string) {
  const referenceDate = shortDate(comparison?.previousScanAt);
  if (!comparison || comparison.status === "baseline") {
    return {
      eyebrow: "Baseline locked",
      title: "Your starting point is saved.",
      body: `Your next ${scanLabel} Scan is compared photo-to-photo with this one. Scores only move when a real visible change shows, not a new pose or better lighting.`,
      badge: "Scan 01",
      accent: false,
    };
  }
  if (comparison.basis === "exact_match") {
    return {
      eyebrow: "Consistency verified",
      title: "Same photo. Same scores.",
      body: comparison.summary,
      badge: "Exact match",
      accent: true,
    };
  }
  if (comparison.status === "change_detected") {
    const copy =
      comparison.direction === "improved"
        ? { eyebrow: "Progress detected", title: "Visible improvement confirmed." }
        : comparison.direction === "regressed"
          ? { eyebrow: "Change detected", title: "Some areas have slipped." }
          : { eyebrow: "Mixed changes", title: "Some areas improved, others slipped." };
    return {
      ...copy,
      body: comparison.summary,
      badge: referenceDate ? `vs ${referenceDate}` : "Verified change",
      accent: comparison.direction === "improved",
    };
  }
  return {
    eyebrow: "Consistency protected",
    title: "No reliable change yet.",
    body: `${comparison.summary} Your scores stay matched to ${
      referenceDate ? `your ${referenceDate} scan` : "your last confirmed scan"
    } until a real change shows.`,
    badge: "Scores held",
    accent: false,
  };
}

export function ScanComparisonCard({
  comparison,
  deltas,
  scanLabel,
}: {
  comparison?: ScanComparisonView;
  deltas: ScanDeltaItem[];
  scanLabel: "Body" | "Face";
}) {
  const copy = comparisonCopy(comparison, scanLabel);
  const visibleDeltas = deltas.filter(
    (item): item is { label: string; value: number } => typeof item.value === "number",
  );

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border p-5",
        copy.accent ? "border-neon/20 bg-neon/[0.055]" : "border-white/[0.08] bg-white/[0.035]",
      )}
    >
      {copy.accent && (
        <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-neon/10 blur-3xl" />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-neon">
          <GitCompareArrows className="size-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{copy.eyebrow}</p>
        </div>
        <span className="rounded-full border border-white/[0.06] bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white/45">
          {copy.badge}
        </span>
      </div>
      <h2 className="relative mt-4 text-xl font-bold tracking-[-0.025em]">{copy.title}</h2>
      <p className="relative mt-2 text-[11px] leading-relaxed text-white/52">{copy.body}</p>

      {comparison?.status === "change_detected" && visibleDeltas.length > 0 && (
        <div className="relative mt-4 grid grid-cols-4 gap-2">
          {visibleDeltas.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.06] bg-black/20 px-2 py-3 text-center"
            >
              <p
                className={cn(
                  "text-base font-black",
                  item.value > 0
                    ? "text-neon"
                    : item.value < 0
                      ? "text-destructive"
                      : "text-white/50",
                )}
              >
                {item.value > 0 ? "+" : ""}
                {item.value}
              </p>
              <p className="mt-1 text-[7px] font-bold uppercase tracking-wider text-white/35">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
