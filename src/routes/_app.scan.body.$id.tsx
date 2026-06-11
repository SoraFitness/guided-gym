import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowDown, ArrowUp, Trash2, Minus } from "lucide-react";
import { BodyScoreCard } from "@/components/bodyscan/BodyScoreCard";
import { BodyScoreBar } from "@/components/bodyscan/BodyScoreBar";
import { deleteScan, getScan, previousScan } from "@/lib/bodyScanStore";
import { SCORE_LABELS, type BodyScanScores } from "@/lib/bodyScan";

export const Route = createFileRoute("/_app/scan/body/$id")({
  head: () => ({ meta: [{ title: "Scan — Pulse" }] }),
  component: ScanDetail,
  notFoundComponent: () => (
    <div className="px-5 pt-10 text-center">
      <p className="text-muted-foreground">Scan not found.</p>
      <Link to="/scan/body" className="text-neon underline text-sm mt-2 inline-block">
        Back to history
      </Link>
    </div>
  ),
});

function delta(curr: number, prev: number) {
  return Math.round(curr - prev);
}

function ScanDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const scan = getScan(id);
  const prev = previousScan(id);

  if (!scan) {
    return (
      <div className="px-5 pt-10 text-center">
        <p className="text-muted-foreground">Scan not found.</p>
        <Link to="/scan/body" className="text-neon underline text-sm mt-2 inline-block">
          Back to history
        </Link>
      </div>
    );
  }

  const overallDelta = prev ? delta(scan.overallScore, prev.overallScore) : null;
  const scoreEntries = Object.entries(scan.scores) as [keyof BodyScanScores, number][];

  return (
    <div className="px-5 pt-5 pb-10 space-y-5 animate-slide-up">
      <header className="flex items-center justify-between">
        <Link
          to="/scan/body"
          className="size-10 rounded-full bg-surface grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="text-xs uppercase tracking-[0.22em] text-neon font-bold">
          {new Date(scan.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <button
          onClick={() => {
            if (confirm("Delete this scan?")) {
              deleteScan(scan.id);
              navigate({ to: "/scan/body" });
            }
          }}
          aria-label="Delete"
          className="size-10 rounded-full bg-surface grid place-items-center text-muted-foreground"
        >
          <Trash2 className="size-4" />
        </button>
      </header>

      <BodyScoreCard scan={scan} image={scan.thumbnail} />

      {prev && overallDelta !== null && (
        <section className="rounded-3xl bg-surface border border-white/5 p-5">
          <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-3">
            Progress vs last scan
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                Previous · {new Date(prev.createdAt).toLocaleDateString()}
              </p>
              <p className="text-3xl font-extrabold mt-1 tabular-nums">{prev.overallScore}</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-bold text-sm ${
                overallDelta > 0
                  ? "bg-neon/15 text-neon"
                  : overallDelta < 0
                    ? "bg-destructive/15 text-destructive"
                    : "bg-white/5 text-muted-foreground"
              }`}
            >
              {overallDelta > 0 ? (
                <ArrowUp className="size-4" />
              ) : overallDelta < 0 ? (
                <ArrowDown className="size-4" />
              ) : (
                <Minus className="size-4" />
              )}
              {overallDelta > 0 ? "+" : ""}
              {overallDelta}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-3xl font-extrabold mt-1 tabular-nums text-neon">
                {scan.overallScore}
              </p>
            </div>
          </div>
        </section>
      )}

      <p className="text-sm text-muted-foreground text-balance leading-relaxed">{scan.summary}</p>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-4">
          Score Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {scoreEntries.map(([k, v], i) => (
            <BodyScoreBar key={k} label={SCORE_LABELS[k]} value={v} delay={i * 0.05} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-neon font-bold mb-3">
          Strengths
        </h3>
        <ul className="space-y-2 text-sm">
          {scan.strengths.map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-surface border border-white/5 p-5">
        <h3 className="text-[10px] uppercase tracking-[0.22em] text-amber-400 font-bold mb-3">
          Areas to improve
        </h3>
        <ul className="space-y-2 text-sm">
          {scan.improvements.map((s) => (
            <li key={s}>· {s}</li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        {scan.disclaimer}
      </p>
    </div>
  );
}
