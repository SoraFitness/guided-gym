import { motion } from "framer-motion";
import { ArrowLeft, Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cardClass, scoreColor } from "@/components/app/kit";
import { cn } from "@/lib/utils";

export function ScanPageHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header
      className="flex items-center justify-between gap-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full active:bg-white/[0.06]"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="truncate text-[22px] font-bold tracking-[-0.02em]">{title}</h1>
      </div>
      {action}
    </header>
  );
}

/** A sample result over the sample photo, so members see the payoff before uploading. */
export function ScanSampleHero({
  photo,
  fit = "cover",
  scoreLabel,
  score,
  bars,
  headline,
  onOpenSample,
}: {
  photo: string;
  fit?: "cover" | "contain";
  scoreLabel: string;
  score: number;
  bars: { label: string; score: number }[];
  headline: string;
  onOpenSample: () => void;
}) {
  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={onOpenSample}
        aria-label="Open the sample report"
        className="relative block w-full overflow-hidden rounded-[28px] border border-hairline bg-surface text-left transition active:scale-[0.99]"
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
          alt="Sample scan"
          className={cn(
            "relative h-[340px] w-full",
            fit === "contain" ? "object-contain" : "object-cover object-top",
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent via-35% to-black/95" />
        <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-[12px] font-semibold backdrop-blur-md">
          Sample
        </span>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/85">
            {scoreLabel}
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span
              className="text-[64px] font-bold leading-[0.9] tracking-[-0.05em]"
              style={{ color: scoreColor(score) }}
            >
              {score}
            </span>
            <span className="text-[20px] font-semibold text-white/85">/100</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {bars.slice(0, 3).map((bar, index) => (
              <div key={bar.label} className="min-w-0">
                <div className="flex items-baseline justify-between gap-1 text-[12px]">
                  <span className="truncate font-medium text-white/80">{bar.label}</span>
                  <span className="font-bold" style={{ color: scoreColor(bar.score) }}>
                    {bar.score}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.score}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.08 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: scoreColor(bar.score) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </button>
      <h2 className="mt-5 px-1 text-[26px] font-bold leading-[1.1] tracking-[-0.03em]">
        {headline}
      </h2>
    </section>
  );
}

export function WhatYouGet({ items }: { items: { icon: LucideIcon; label: string }[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className={cn(cardClass, "flex items-center gap-3 rounded-[18px] p-3.5")}>
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-neon/12 text-neon">
            <Icon className="size-5" />
          </span>
          <span className="text-[14px] font-semibold leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function PhotoChecklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] font-medium text-foreground/85"
        >
          <Check className="size-3.5 text-score-high" /> {item}
        </li>
      ))}
    </ul>
  );
}
