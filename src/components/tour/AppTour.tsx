import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { TourStep } from "@/lib/tourSteps";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  steps: TourStep[];
  onClose: (completed: boolean) => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;
const RADIUS = 20;

export function AppTour({ open, steps, onClose }: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const isFirst = index === 0;

  // reset to step 1 whenever the tour reopens
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // navigate to the step's route when it changes
  useEffect(() => {
    if (!open || !step) return;
    if (step.route && pathname !== step.route) {
      navigate({ to: step.route });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // track viewport size
  useLayoutEffect(() => {
    if (!open) return;
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  // measure target — retry while the route mounts
  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    let raf = 0;
    let tries = 0;

    const measure = () => {
      if (cancelled) return;
      if (!step.targetId || step.placement === "center") {
        setRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${step.targetId}"]`,
      );
      if (!el) {
        if (tries++ < 30) {
          raf = window.requestAnimationFrame(measure);
        } else {
          setRect(null); // fallback to centered modal
        }
        return;
      }
      // bring it into view first
      const r = el.getBoundingClientRect();
      const needsScroll = r.top < 80 || r.bottom > window.innerHeight - 220;
      if (needsScroll) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        // re-measure after smooth scroll settles
        setTimeout(() => {
          if (cancelled) return;
          const r2 = el.getBoundingClientRect();
          setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
        }, 320);
      } else {
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };

    // wait one frame so the route renders
    raf = window.requestAnimationFrame(measure);

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, index, step, pathname]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  const handleNext = () => {
    if (isLast) {
      onClose(true);
    } else {
      setIndex((i) => Math.min(steps.length - 1, i + 1));
    }
  };
  const handleBack = () => {
    if (!isFirst) setIndex((i) => Math.max(0, i - 1));
  };
  const handleSkip = () => onClose(true);

  if (!open || !step) return null;

  // compute tooltip position
  const tipW = Math.min(viewport.w - 32, 360);
  const tipH = 220; // rough; card auto-sizes

  let tipTop = viewport.h / 2 - tipH / 2;
  let tipLeft = (viewport.w - tipW) / 2;
  let arrow: "up" | "down" | null = null;

  if (rect) {
    const spaceBelow = viewport.h - (rect.top + rect.height);
    const spaceAbove = rect.top;
    const preferBelow = step.placement !== "top";
    const fitsBelow = spaceBelow > tipH + 20;
    const fitsAbove = spaceAbove > tipH + 20;
    const placeBelow = preferBelow ? fitsBelow || !fitsAbove : !fitsAbove;

    if (placeBelow) {
      tipTop = rect.top + rect.height + PAD + 12;
      arrow = "up";
    } else {
      tipTop = rect.top - tipH - PAD - 12;
      arrow = "down";
    }
    // clamp horizontally so card stays on-screen
    const centerX = rect.left + rect.width / 2;
    tipLeft = Math.min(
      Math.max(16, centerX - tipW / 2),
      viewport.w - tipW - 16,
    );
    // clamp vertically
    tipTop = Math.max(16, Math.min(viewport.h - tipH - 16, tipTop));
  }

  const Icon = step.icon;
  const N = steps.length;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* dark backdrop with svg mask cut-out */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        onClick={handleSkip}
        aria-hidden
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <motion.rect
                initial={false}
                animate={{
                  x: rect.left - PAD,
                  y: rect.top - PAD,
                  width: rect.width + PAD * 2,
                  height: rect.height + PAD * 2,
                  rx: RADIUS,
                  ry: RADIUS,
                }}
                transition={{ type: "spring", stiffness: 240, damping: 28 }}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2,4,8,0.78)"
          mask="url(#tour-mask)"
          style={{
            // @ts-expect-error - css filter on svg
            backdropFilter: "blur(2px)",
          }}
        />
      </svg>

      {/* highlight ring around target */}
      {rect && (
        <motion.div
          className="absolute pointer-events-none rounded-[20px]"
          initial={false}
          animate={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          style={{
            boxShadow:
              "0 0 0 2px oklch(0.92 0.21 130), 0 0 60px 8px oklch(0.92 0.21 130 / 0.35)",
          }}
        />
      )}

      {/* tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="absolute pointer-events-auto"
          style={{ top: tipTop, left: tipLeft, width: tipW }}
        >
          {arrow === "up" && (
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 bg-surface border-l border-t border-white/10"
              aria-hidden
            />
          )}
          {arrow === "down" && (
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-3 rotate-45 bg-surface border-r border-b border-white/10"
              aria-hidden
            />
          )}

          <div className="relative rounded-3xl bg-surface border border-white/10 shadow-2xl overflow-hidden">
            {/* glow header */}
            <div
              className="absolute inset-x-0 top-0 h-24 pointer-events-none opacity-70"
              style={{
                background:
                  "radial-gradient(60% 80% at 20% 0%, oklch(0.92 0.21 130 / 0.25), transparent 70%)",
              }}
            />
            <div className="relative p-5">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-neon/15 text-neon grid place-items-center shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-neon font-bold">
                    Step {index + 1} of {N}
                  </div>
                  <h3 className="mt-0.5 text-lg font-extrabold leading-tight">
                    {step.title}
                  </h3>
                </div>
                <button
                  onClick={handleSkip}
                  className="size-8 rounded-full bg-white/[0.06] grid place-items-center text-muted-foreground hover:text-foreground"
                  aria-label="Skip tour"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </p>

              {/* progress dots */}
              <div className="mt-4 flex items-center gap-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all",
                      i === index
                        ? "w-6 bg-neon"
                        : i < index
                        ? "w-2 bg-neon/50"
                        : "w-2 bg-white/15",
                    )}
                  />
                ))}
              </div>

              {/* actions */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="h-10 px-3 rounded-full text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  Skip Tour
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={handleBack}
                    disabled={isFirst}
                    className="h-10 px-4 rounded-full bg-white/[0.06] border border-white/[0.06] text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <ArrowLeft className="size-3.5" /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="h-10 px-4 rounded-full bg-neon text-neon-foreground text-[12px] font-bold flex items-center gap-1.5 glow-neon active:scale-95 transition"
                  >
                    {isLast ? (
                      <>
                        <Check className="size-3.5" /> Finish
                      </>
                    ) : (
                      <>
                        Next <ArrowRight className="size-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
