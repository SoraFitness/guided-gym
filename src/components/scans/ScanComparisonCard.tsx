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
        "rounded-[24px] border p-5",
        copy.accent ? "border-neon/25 bg-neon/[0.06]" : "border-hairline bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-neon">
          <GitCompareArrows className="size-4" /> {copy.eyebrow}
        </p>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
          {copy.badge}
        </span>
      </div>
      <h2 className="mt-3 text-[18px] font-bold tracking-[-0.02em]">{copy.title}</h2>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{copy.body}</p>

      {comparison?.status === "change_detected" && visibleDeltas.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {visibleDeltas.map((item) => (
            <div key={item.label} className="rounded-[16px] bg-white/[0.04] px-2 py-3 text-center">
              <p
                className="text-[18px] font-bold tabular-nums"
                style={{
                  color:
                    item.value > 0
                      ? "var(--color-score-high)"
                      : item.value < 0
                        ? "var(--color-score-low)"
                        : undefined,
                }}
              >
                {item.value > 0 ? "+" : ""}
                {item.value}
              </p>
              <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
