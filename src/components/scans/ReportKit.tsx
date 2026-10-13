import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Download,
  History,
  Loader2,
  RefreshCcw,
  Share,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  AscentMark,
  cardClass,
  DeltaBadge,
  primaryButtonClass,
  scoreColor,
} from "@/components/app/kit";
import { cn } from "@/lib/utils";

export function ReportShell({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh overflow-x-hidden bg-background text-foreground"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)" }}
    >
      <div className="mx-auto max-w-md px-4 sm:px-5">{children}</div>
    </motion.main>
  );
}

export function ReportHeader({
  title,
  onBack,
  onCoachRead,
}: {
  title: string;
  onBack: () => void;
  onCoachRead?: () => void;
}) {
  return (
    <header
      className="flex items-center justify-between gap-3 pb-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Close report"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 active:bg-white/[0.06]"
        >
          <X className="size-6" />
        </button>
        <h1 className="truncate text-[20px] font-bold tracking-[-0.02em]">{title}</h1>
      </div>
      {onCoachRead && (
        <button
          type="button"
          onClick={onCoachRead}
          className="flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-neon"
        >
          <Sparkles className="size-4" /> Coach&apos;s read
        </button>
      )}
    </header>
  );
}

export function PhotoScoreHero({
  photo,
  alt,
  scoreLabel,
  score,
  chips,
  delta,
  fit = "cover",
  badge,
}: {
  photo: string;
  alt: string;
  scoreLabel: string;
  score: number;
  chips: ReactNode[];
  delta?: number | null;
  fit?: "cover" | "contain";
  badge?: ReactNode;
}) {
  return (
    <section
      role="region"
      aria-label={`${scoreLabel}: ${score} out of 100`}
      className="chamfer relative overflow-hidden rounded-[28px] bg-surface shadow-[inset_0_0_0_1px_var(--hairline)]"
      style={{ ["--chamfer" as string]: "34px" }}
    >
      {fit === "contain" && (
        <img
          src={photo}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-110 object-cover opacity-50 blur-2xl"
        />
      )}
      <img
        src={photo}
        alt={alt}
        className={cn(
          "relative h-[460px] w-full",
          fit === "contain" ? "object-contain" : "object-cover object-top",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-40% to-black/90" />

      {/* One pass of the vision scan when the report opens. */}
      <motion.div
        aria-hidden
        initial={{ top: "-12%", opacity: 0 }}
        animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
        className="pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-neon/25 to-neon/70"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 h-[3px] origin-top-left bg-neon"
        style={{
          left: "calc(100% - 34px)",
          width: 34 * Math.SQRT2,
          transform: "rotate(45deg) translateY(-1.5px)",
        }}
      />
      {(
        ["left-4 top-14 border-l-2 border-t-2", "right-4 top-14 border-r-2 border-t-2"] as const
      ).map((position) => (
        <span
          key={position}
          aria-hidden
          className={cn("pointer-events-none absolute size-5 border-white/35", position)}
        />
      ))}

      <div className="absolute left-4 right-14 top-4 flex items-center gap-2">
        <span className="font-data inline-flex items-center gap-1.5 rounded-[8px] bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase text-neon backdrop-blur-md">
          <AscentMark className="size-2" /> Ascendr vision
        </span>
        {badge}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="kicker text-white/85">{scoreLabel}</p>
        <div className="mt-1.5 flex items-end gap-3">
          <p className="flex items-baseline gap-1 tabular-nums">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-[84px] font-bold leading-[0.85] tracking-[-0.05em]"
              style={{ color: scoreColor(score) }}
            >
              {score}
            </motion.span>
            <span className="text-[24px] font-semibold text-white/85">/100</span>
          </p>
          {delta ? <DeltaBadge value={delta} className="mb-1.5" /> : null}
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {chips.map((chip, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-white/20 bg-black/50 px-2.5 py-1.5 text-[13px] font-semibold backdrop-blur-md [&_svg]:size-3.5"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReportSection({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-7", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
        {meta && <div className="text-[13px] font-medium text-muted-foreground">{meta}</div>}
      </div>
      {children}
    </section>
  );
}

export function RankedChips({
  strongest,
  weakest,
}: {
  strongest: { label: string; score: number }[];
  weakest: { label: string; score: number }[];
}) {
  const column = (title: string, items: { label: string; score: number }[], tone: string) => (
    <div className={cn(cardClass, "min-w-0 rounded-[20px] p-4")}>
      <p className="text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: tone }}>
        {title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2">
            <span className="truncate text-[15px] font-semibold">{item.label}</span>
            <span
              className="text-[15px] font-bold tabular-nums"
              style={{ color: scoreColor(item.score) }}
            >
              {item.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {column("Strongest", strongest, "var(--color-score-high)")}
      {column("Focus next", weakest, "var(--color-score-mid)")}
    </div>
  );
}

export function ActionPlan({ actions }: { actions: { title: string; detail: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ol className="space-y-2">
      {actions.map((action, index) => {
        const expanded = open === index;
        return (
          <li key={`${action.title}-${index}`} className={cn(cardClass, "rounded-[20px]")}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : index)}
              aria-expanded={expanded}
              className="flex w-full items-center gap-3.5 p-4 text-left"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full text-[14px] font-bold",
                  index === 0 ? "bg-neon text-neon-foreground" : "bg-white/[0.07]",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                {action.title}
              </span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden px-4 pl-[66px] text-[14px] leading-relaxed text-muted-foreground"
                >
                  <span className="block pb-4">{action.detail}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ol>
  );
}

export function CoachReadSheet({
  open,
  onClose,
  summary,
  highlights,
  highlightsTitle,
  confidence,
}: {
  open: boolean;
  onClose: () => void;
  summary: string;
  highlights: string[];
  highlightsTitle: string;
  confidence: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Coach's read"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border border-hairline bg-surface px-5 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-white/15" />
            <div className="mt-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[18px] font-bold">
                <Sparkles className="size-5 text-neon" /> Coach&apos;s read
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-10 place-items-center rounded-full bg-white/[0.06]"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-4 text-[16px] leading-relaxed text-foreground/90">{summary}</p>
            <p className="kicker mt-6">{highlightsTitle}</p>
            <ul className="mt-3 space-y-2.5">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] leading-snug">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-score-high/15 text-score-high">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground">
              <ShieldCheck className="size-4" /> {Math.round(confidence * 100)}% photo clarity
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ShareActions({
  busy,
  onShare,
  onSave,
}: {
  busy: "share" | "save" | null;
  onShare: () => void;
  onSave: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2.5">
      <button
        type="button"
        onClick={onShare}
        disabled={Boolean(busy)}
        className={primaryButtonClass}
      >
        {busy === "share" ? <Loader2 className="animate-spin" /> : <Share />}
        Share my score
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={Boolean(busy)}
        aria-label="Save image"
        className="grid size-14 place-items-center rounded-[18px] border border-hairline bg-surface transition active:scale-95 disabled:opacity-50"
      >
        {busy === "save" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Download className="size-5" />
        )}
      </button>
    </div>
  );
}

export function ReportFooter({
  disclaimer,
  resetLabel,
  onReset,
  onHistory,
}: {
  disclaimer: string;
  resetLabel: string;
  onReset?: () => void;
  onHistory?: () => void;
}) {
  return (
    <>
      <div className="mt-7 flex items-start gap-3 px-1">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">{disclaimer}</p>
      </div>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-white text-[15px] font-bold text-black transition active:scale-[0.985]"
        >
          <RefreshCcw className="size-4" /> {resetLabel}
        </button>
      )}
      {onHistory && (
        <button
          type="button"
          onClick={onHistory}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold text-muted-foreground"
        >
          <History className="size-4" /> Scan history
        </button>
      )}
    </>
  );
}

/**
 * On-screen brand banner for marketing scans, so a screenshot of the report
 * carries the app name and where to get it. Members never see this.
 */
export function MarketingBanner() {
  return (
    <section className="mt-4 flex flex-col items-center rounded-[24px] border border-neon/30 bg-neon/[0.08] p-5 text-center">
      <img
        src="/media/ascendr-logo.png"
        alt=""
        className="size-[64px] rounded-2xl border border-neon/30 bg-black/50 object-cover"
      />
      {/* Kept as one exact string so it matches the App Store listing when searched. */}
      <p className="mt-3 text-[25px] font-bold leading-[1.1] tracking-[-0.03em] text-neon">
        Ascendr: Smart Fitness App
      </p>
      <p className="mt-2 text-[14px] font-semibold text-white/80">Now available on the App Store</p>
    </section>
  );
}

export function SampleBadge({ demo }: { demo: boolean }) {
  return (
    <span className="font-data rounded-[8px] bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase text-white/80 backdrop-blur-md">
      {demo ? "Sample" : "Private"}
    </span>
  );
}
