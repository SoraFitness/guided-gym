import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Dumbbell,
  Apple,
  Activity,
  Scan,
  LineChart,
  Sparkles,
  Box,
  Zap,
  Star,
  ArrowRight,
  X,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribe, restorePurchases, PLAN_PRICES, type Plan } from "@/lib/subscription";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/paywall")({
  head: () => ({
    meta: [
      { title: "Unlock Premium — Ascendr Pro" },
      {
        name: "description",
        content:
          "Personalized workouts, nutrition tools, and progress tracking — all in one premium fitness app.",
      },
    ],
  }),
  component: PaywallScreen,
});

const APP_NAME = "ASCENDR PRO";

const FEATURES = [
  { icon: Dumbbell, text: "Personalized workout plans" },
  { icon: Box, text: "3D exercise guidance & full library" },
  { icon: Apple, text: "Smart nutrition tracking" },
  { icon: LineChart, text: "Progress & strength analytics" },
  { icon: Scan, text: "AI body scan insights" },
  { icon: Zap, text: "Faster results with guided structure" },
];

function PaywallScreen() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const [selected, setSelected] = useState<Plan>("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [referral, setReferral] = useState(profile?.referralCode ?? "");
  const [referralApplied, setReferralApplied] = useState(!!profile?.referralCode);
  const [referralOpen, setReferralOpen] = useState(!!profile?.referralCode);

  const applyReferral = () => {
    const code = referral.trim().toUpperCase();
    if (!code) return;
    setReferral(code);
    if (profile) updateProfile({ referralCode: code });
    setReferralApplied(true);
  };

  const handlePurchase = () => {
    setPurchasing(true);
    setTimeout(() => {
      subscribe(selected);
      navigate({ to: "/home" });
    }, 900);
  };

  const handleRestore = () => {
    const sub = restorePurchases();
    if (sub.active) navigate({ to: "/home" });
    else alert("No previous purchases found.");
  };

  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-neon/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-neon/10 blur-3xl" />

      <div className="relative mx-auto max-w-md px-5 pt-6 pb-40">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 rounded-full bg-neon" />
            <div className="h-1 w-8 rounded-full bg-neon" />
            <div className="h-1 w-8 rounded-full bg-neon" />
            <div className="h-1 w-8 rounded-full bg-white/15" />
          </div>
          <button
            onClick={() => navigate({ to: "/home" })}
            className="h-9 w-9 grid place-items-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Premium label */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-neon" />
          <span className="text-xs font-bold tracking-[0.25em] text-neon">{APP_NAME}</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
          className="mt-3 text-[40px] leading-[1.05] font-bold tracking-tight"
        >
          Unlock Your <span className="text-neon">Best Body</span>
        </motion.h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
          Personalized workouts, nutrition tools, progress tracking, and premium fitness insights —
          your complete training system.
        </p>

        {/* Social proof */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex -space-x-2">
            {[
              "from-emerald-400 to-emerald-700",
              "from-amber-400 to-amber-700",
              "from-rose-400 to-rose-700",
              "from-sky-400 to-sky-700",
            ].map((g, i) => (
              <div
                key={i}
                className={cn(
                  "h-6 w-6 rounded-full border-2 border-background bg-gradient-to-br",
                  g,
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-neon text-neon" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Trusted by thousands</span>
          </div>
        </div>

        {/* Plan cards — moved to top */}
        <div className="mt-7 space-y-3">
          <PlanCard
            plan="yearly"
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
            badge="BEST VALUE · SAVE 90%"
          />
          <PlanCard
            plan="weekly"
            selected={selected === "weekly"}
            onSelect={() => setSelected("weekly")}
          />
        </div>

        {/* Benefits */}
        <div className="mt-8">
          <h2 className="text-xs font-bold tracking-[0.2em] text-muted-foreground mb-3">
            WHAT YOU GET
          </h2>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur p-5 space-y-3.5">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-neon/15 grid place-items-center border border-neon/25">
                  <f.icon className="h-4 w-4 text-neon" />
                </div>
                <span className="text-sm font-medium">{f.text}</span>
                <Check className="ml-auto h-4 w-4 text-neon" />
              </div>
            ))}
          </div>
        </div>

        {/* Free vs Premium comparison */}
        <div className="mt-8">
          <h2 className="text-xs font-bold tracking-[0.2em] text-muted-foreground mb-3">
            FREE VS PREMIUM
          </h2>
          <ComparisonTable />
        </div>

        {/* Referral code */}
        <div className="mt-6">
          {!referralOpen ? (
            <button
              onClick={() => setReferralOpen(true)}
              className="w-full h-12 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition"
            >
              <Tag className="h-4 w-4" />
              Have a referral code?
            </button>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <Tag className="h-3.5 w-3.5" /> Referral code
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={referral}
                  onChange={(e) => {
                    setReferral(e.target.value.toUpperCase());
                    setReferralApplied(false);
                  }}
                  placeholder="ENTER CODE"
                  maxLength={24}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 text-base tracking-widest uppercase outline-none focus:border-neon/40"
                />
                <button
                  onClick={applyReferral}
                  disabled={!referral.trim()}
                  className={cn(
                    "h-11 px-4 rounded-xl text-sm font-semibold transition",
                    referral.trim()
                      ? "bg-neon text-neon-foreground"
                      : "bg-white/[0.05] text-muted-foreground",
                  )}
                >
                  Apply
                </button>
              </div>
              {referralApplied && (
                <div className="mt-3 flex items-center gap-2 text-xs text-neon">
                  <Check className="h-4 w-4" strokeWidth={3} /> Code saved
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-md px-5">
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className={cn(
              "w-full h-14 rounded-2xl bg-neon text-neon-foreground font-bold text-base",
              "shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--neon)_60%,transparent)]",
              "flex items-center justify-center gap-2 active:scale-[0.98] transition",
              purchasing && "opacity-70",
            )}
          >
            {purchasing ? (
              "Processing…"
            ) : (
              <>
                Unlock Premium <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Cancel anytime · {PLAN_PRICES[selected].price}
            {PLAN_PRICES[selected].per}
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <button onClick={handleRestore} className="hover:text-foreground">
              Restore Purchases
            </button>
            <span className="opacity-40">·</span>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <span className="opacity-40">·</span>
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
          </div>
          <p className="mt-2 text-center text-[10px] leading-snug text-muted-foreground/70 px-4">
            Subscription auto-renews until canceled at least 24 hours before the end of the current
            period. Manage in account settings.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
  badge,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  const p = PLAN_PRICES[plan];
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left relative rounded-2xl border p-4 transition-all",
        selected
          ? "border-neon bg-neon/[0.06] shadow-[0_0_0_1px_var(--neon),0_8px_30px_-10px_color-mix(in_oklab,var(--neon)_50%,transparent)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20",
      )}
    >
      {badge && (
        <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-neon text-neon-foreground text-[10px] font-bold tracking-wider">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 grid place-items-center shrink-0",
            selected ? "border-neon bg-neon" : "border-white/30",
          )}
        >
          {selected && <Check className="h-3 w-3 text-neon-foreground" strokeWidth={3} />}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{p.label}</span>
            <span className="text-lg font-bold">
              {p.price}
              <span className="text-xs font-medium text-muted-foreground">{p.per}</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{p.subtitle}</p>
        </div>
      </div>
    </button>
  );
}

const COMPARISON_ROWS: { label: string; free: string | false; premium: string | true }[] = [
  { label: "Basic workouts", free: "Yes", premium: "Yes" },
  { label: "Personalized workout plans", free: false, premium: "Yes" },
  { label: "3D exercise demos", free: "Limited", premium: "Full access" },
  { label: "Nutrition tracking", free: "Basic", premium: "Advanced" },
  { label: "Progress tracking", free: "Basic", premium: "Advanced" },
  { label: "Body scan insights", free: false, premium: "Yes" },
  { label: "Premium tools", free: false, premium: "Yes" },
  { label: "Guided structure & coaching", free: "Limited", premium: "Yes" },
];

function ComparisonTable() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[1.3fr_0.8fr_0.9fr] items-center px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <span className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground">
          FEATURE
        </span>
        <span className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground text-center">
          FREE
        </span>
        <span className="text-[11px] font-bold tracking-[0.15em] text-neon text-center flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" /> PREMIUM
        </span>
      </div>

      {COMPARISON_ROWS.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "grid grid-cols-[1.3fr_0.8fr_0.9fr] items-center px-4 py-3",
            i !== COMPARISON_ROWS.length - 1 && "border-b border-white/5",
          )}
        >
          <span className="text-[13px] font-medium pr-2">{row.label}</span>
          <span className="text-center">
            {row.free === false ? (
              <X className="inline h-4 w-4 text-muted-foreground/50" />
            ) : (
              <span className="text-xs text-muted-foreground">{row.free}</span>
            )}
          </span>
          <span className="text-center">
            {row.premium === true || row.premium === "Yes" ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neon/15 border border-neon/30">
                <Check className="h-3 w-3 text-neon" strokeWidth={3} />
              </span>
            ) : (
              <span className="text-xs font-semibold text-neon">{row.premium}</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
