import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { useAuthSession } from "@/lib/authSession";
import { syncProfileToCloud } from "@/lib/profileSync";
import {
  clearOnboardingResume,
  getOnboardingPaywallCheckpoint,
  markOnboardingPaywallVisited,
} from "@/lib/onboardingResume";

export const Route = createFileRoute("/paywall")({
  validateSearch: (search: Record<string, unknown>) => ({
    source:
      search.source === "body-scan" || search.source === "face-scan" ? search.source : undefined,
  }),
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
  const { source } = Route.useSearch();
  const { profile, updateProfile } = useProfile();
  const session = useAuthSession();
  const scanOffer = source === "body-scan" || source === "face-scan";
  const faceScanOffer = source === "face-scan";
  const [selected, setSelected] = useState<Plan>("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [referral, setReferral] = useState(profile?.referralCode ?? "");
  const [referralApplied, setReferralApplied] = useState(!!profile?.referralCode);
  const [referralSaving, setReferralSaving] = useState(false);
  const [checkpoint] = useState(() => getOnboardingPaywallCheckpoint());
  const returningUser = Boolean(checkpoint?.lastVisitedAt);

  useEffect(() => {
    markOnboardingPaywallVisited();
  }, []);

  const continueAfterUnlock = () => {
    clearOnboardingResume();
    if (scanOffer) {
      if (faceScanOffer) {
        navigate({ to: "/scan/face", search: { pending: "onboarding" } });
      } else {
        navigate({ to: "/scan/body/new", search: { pending: "onboarding" } });
      }
    } else {
      navigate({ to: "/home" });
    }
  };

  const applyReferral = async () => {
    const code = referral.trim().toUpperCase();
    if (!code) return;
    setReferral(code);
    if (!profile) return;

    const nextProfile = { ...profile, referralCode: code };
    updateProfile({ referralCode: code });
    setReferralSaving(true);
    try {
      if (session && session !== "loading") {
        await syncProfileToCloud(session.userId, nextProfile);
      }
      setReferralApplied(true);
    } catch (error) {
      console.warn("[paywall] Referral code saved locally; cloud sync will retry", error);
      setReferralApplied(true);
    } finally {
      setReferralSaving(false);
    }
  };

  const handlePurchase = () => {
    setPurchasing(true);
    setTimeout(() => {
      subscribe(selected);
      continueAfterUnlock();
    }, 900);
  };

  const handleRestore = () => {
    const sub = restorePurchases();
    if (sub.active) {
      continueAfterUnlock();
    } else alert("No previous purchases found.");
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
          <span className="text-xs font-bold tracking-[0.25em] text-neon">
            {scanOffer ? `ASCENDR ${faceScanOffer ? "FACE" : "BODY"} SCAN` : APP_NAME}
          </span>
        </motion.div>

        {returningUser && checkpoint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-neon/20 bg-neon/[0.07] px-4 py-3"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">
              Welcome back, {checkpoint.name}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your answers and personalized setup are saved. You can continue exactly where you left
              off.
            </p>
          </motion.div>
        )}

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
          className="mt-3 text-[40px] leading-[1.05] font-bold tracking-tight"
        >
          {scanOffer ? (
            <>
              Your Analysis Is <span className="text-neon">Ready</span>
            </>
          ) : (
            <>
              Unlock Your <span className="text-neon">Best Body</span>
            </>
          )}
        </motion.h1>
        {scanOffer && (
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {faceScanOffer
              ? "Unlock your appearance score, facial symmetry, jawline, skin, eye-area, looksmax potential, and personalized action plan."
              : "Unlock your full physique score, muscle development, symmetry, body-fat range, potential, and personalized action plan."}
          </p>
        )}
        <p
          className={cn(
            "mt-4 text-[15px] leading-relaxed text-muted-foreground",
            scanOffer && "hidden",
          )}
        >
          Personalized workouts, nutrition tools, progress tracking, and premium fitness insights —
          your complete training system.
        </p>

        {scanOffer && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-neon/25 bg-neon/[0.07] p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-neon text-neon-foreground">
              <Scan className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold">
                Your {faceScanOffer ? "face" : "body"} analysis is ready
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Your private AI report is complete. Subscribe to reveal every score, insight, and
                action step.
              </p>
            </div>
          </div>
        )}

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
        <div className="mt-7 space-y-2">
          <PlanCard
            plan="yearly"
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
            badge="SAVE 79%"
          />
          <PlanCard
            plan="monthly"
            selected={selected === "monthly"}
            onSelect={() => setSelected("monthly")}
          />
          <PlanCard
            plan="weekly"
            selected={selected === "weekly"}
            onSelect={() => setSelected("weekly")}
          />
        </div>
        <p className="mt-3 px-2 text-center text-[10px] leading-snug text-muted-foreground/70">
          Subscription auto-renews until canceled at least 24 hours before the end of the current
          period. Manage it in your App Store account settings.
        </p>

        {/* Optional referral code lives at checkout, not in onboarding. */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-neon/20 bg-neon/10 text-neon">
              <Tag className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">Referral code</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Optional — apply a creator or friend code before checkout.
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={referral}
              onChange={(event) => {
                setReferral(event.target.value.toUpperCase());
                setReferralApplied(false);
              }}
              placeholder="ENTER CODE"
              maxLength={24}
              aria-label="Referral code"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 text-sm font-semibold tracking-widest uppercase outline-none focus:border-neon/40"
            />
            <button
              type="button"
              onClick={() => void applyReferral()}
              disabled={!referral.trim() || referralSaving}
              className={cn(
                "h-11 rounded-xl px-4 text-sm font-semibold transition",
                referral.trim() && !referralSaving
                  ? "bg-neon text-neon-foreground"
                  : "bg-white/[0.05] text-muted-foreground",
              )}
            >
              {referralSaving ? "Saving…" : "Apply"}
            </button>
          </div>
          {referralApplied && (
            <div className="mt-3 flex items-center gap-2 text-xs font-medium text-neon">
              <Check className="size-4" strokeWidth={3} /> Code saved to your Ascendr profile
            </div>
          )}
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
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-2"
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
                {scanOffer ? "Unlock My Results" : "Unlock Premium"}
                <ArrowRight className="h-5 w-5" />
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
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
            <span className="opacity-40">·</span>
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
          </div>
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
        "relative w-full rounded-full border px-4 py-3 text-left transition-all",
        selected
          ? "border-neon bg-neon/[0.06] shadow-[0_0_0_1px_var(--neon),0_8px_30px_-10px_color-mix(in_oklab,var(--neon)_50%,transparent)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20",
      )}
    >
      {badge && (
        <span className="absolute right-4 top-0 -translate-y-1/2 whitespace-nowrap rounded-full bg-neon px-2 py-0.5 text-[9px] font-bold tracking-wider text-neon-foreground">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2",
            selected ? "border-neon bg-neon" : "border-white/30",
          )}
        >
          {selected && <Check className="h-3 w-3 text-neon-foreground" strokeWidth={3} />}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold">{p.label}</span>
          <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{p.subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-lg font-bold leading-none">{p.price}</span>
          <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{p.per}</span>
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
