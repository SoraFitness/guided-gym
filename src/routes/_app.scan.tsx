import { createFileRoute, Link } from "@tanstack/react-router";
import { Apple, ScanLine, ChevronRight, Camera } from "lucide-react";

export const Route = createFileRoute("/_app/scan")({
  head: () => ({ meta: [{ title: "Scan — Pulse" }] }),
  component: ScanHub,
});

function ScanHub() {
  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-neon font-bold">Scan</p>
        <h1 className="text-3xl font-bold mt-1">What do you want to scan?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get instant insights with AI vision.
        </p>
      </header>

      <div className="space-y-4">
        <Link
          to="/scan/body"
          className="block rounded-3xl bg-gradient-to-br from-surface to-black border border-white/10 p-5 hover:border-neon/40 transition group"
        >
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-neon/15 grid place-items-center text-neon">
              <ScanLine className="size-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Body Scan</h2>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-neon transition" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Rate your physique. Posture, symmetry, definition, and a personalised plan.
              </p>
              <div className="flex gap-2 mt-3">
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-white/70 font-semibold">
                  Posture
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-white/70 font-semibold">
                  Symmetry
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-white/70 font-semibold">
                  Proportions
                </span>
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/nutrition"
          className="block rounded-3xl bg-gradient-to-br from-surface to-black border border-white/10 p-5 hover:border-neon/40 transition group"
        >
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl bg-orange-500/15 grid place-items-center text-orange-400">
              <Apple className="size-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Food Scan</h2>
                <ChevronRight className="size-5 text-muted-foreground group-hover:text-neon transition" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Snap a meal or scan a barcode to log calories and macros instantly.
              </p>
              <div className="flex gap-2 mt-3">
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-white/70 font-semibold">
                  <Camera className="size-3" /> Photo
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 text-white/70 font-semibold">
                  Barcode
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
