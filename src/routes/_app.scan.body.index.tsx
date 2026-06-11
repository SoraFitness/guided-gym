import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { deleteScan, useScans } from "@/lib/bodyScanStore";
import { SCAN_DISCLAIMER } from "@/lib/bodyScan";

export const Route = createFileRoute("/_app/scan/body/")({
  head: () => ({ meta: [{ title: "Body Scan — Pulse" }] }),
  component: BodyScanIntro,
});

function BodyScanIntro() {
  const navigate = useNavigate();
  const scans = useScans();
  const latest = scans[0];

  return (
    <div className="px-5 pt-6 pb-10 animate-slide-up">
      <header className="flex items-center gap-3 mb-6">
        <Link
          to="/scan"
          className="size-10 rounded-full bg-surface grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-neon font-bold">Body Scan</p>
          <h1 className="text-2xl font-bold">Scan Your Physique</h1>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[28px] overflow-hidden border border-white/5 bg-gradient-to-br from-surface via-black to-black aspect-[4/5]"
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.92 0.21 130 / 0.25) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.92 0.21 130 / 0.25) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/60 font-bold">
            Physique AI
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neon/20 text-neon">
            <Sparkles className="size-3" /> Vision
          </span>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          <h2 className="text-3xl font-bold leading-tight text-balance">
            Get instant ratings tailored to your physique.
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-[28ch]">
            Upload front, side and back photos. Get posture, symmetry, and a plan.
          </p>
        </div>
      </motion.div>

      <button
        onClick={() => navigate({ to: "/scan/body/new" })}
        className="mt-5 w-full h-14 rounded-2xl bg-neon text-neon-foreground font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition"
        style={{ boxShadow: "0 14px 40px -10px oklch(0.92 0.21 130 / 0.55)" }}
      >
        Start Body Scan
      </button>
      <p className="mt-3 text-[11px] text-center text-muted-foreground leading-relaxed">
        {SCAN_DISCLAIMER}
      </p>

      {scans.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">History</h3>
            <span className="text-xs text-muted-foreground">{scans.length} scans</span>
          </div>
          <div className="space-y-2">
            {latest && (
              <Link
                to="/scan/body/$id"
                params={{ id: latest.id }}
                className="block rounded-2xl bg-surface border border-neon/20 p-4 hover:border-neon/40 transition"
              >
                <div className="flex items-center gap-4">
                  {latest.thumbnail ? (
                    <img
                      src={latest.thumbnail}
                      alt="Latest scan"
                      className="size-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-black grid place-items-center text-2xl font-extrabold text-neon">
                      {latest.overallScore}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-neon font-bold">
                      Latest · {latest.level}
                    </p>
                    <p className="font-bold">Score {latest.overallScore}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(latest.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
              </Link>
            )}
            {scans.slice(1).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl bg-surface/60 p-3 border border-white/5"
              >
                <Link
                  to="/scan/body/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  {s.thumbnail ? (
                    <img
                      src={s.thumbnail}
                      alt="Scan"
                      className="size-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="size-12 rounded-lg bg-black grid place-items-center text-sm font-extrabold text-neon">
                      {s.overallScore}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {s.level} · {s.overallScore}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => {
                    if (confirm("Delete this scan?")) deleteScan(s.id);
                  }}
                  className="size-8 rounded-full grid place-items-center text-muted-foreground hover:text-destructive transition"
                  aria-label="Delete scan"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 text-[11px] text-muted-foreground text-center leading-relaxed">
        Photos are only used to generate your scan and stay on this device unless you save them.
      </p>
    </div>
  );
}
