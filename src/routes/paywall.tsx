import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Dumbbell,
  Apple,
  Scan,
  LineChart,
  LockKeyhole,
  Sparkles,
  Box,
  Zap,
  Star,
  ArrowRight,
  X,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AscendrLogo } from "@/components/AscendrLogo";
import {
  isPurchaseCancelled,
  purchaseSubscription,
  restorePurchases,
  useSubscription,
  type Plan,
  type PlanPrices,
} from "@/lib/subscription";
import { useProfile } from "@/lib/profile";
import { useAuthSession } from "@/lib/authSession";
import { syncProfileToCloud } from "@/lib/profileSync";
import { SoftAccountPrompt } from "@/components/SoftAccountPrompt";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { consumeSubscriptionResumePath } from "@/lib/subscriptionResume";
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

const COMMUNITY_AVATARS = [
  "/media/community/member-1.jpg",
  "/media/community/member-2.jpg",
  "/media/community/member-3.jpg",
  "/media/community/member-4.jpg",
] as const;

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
  const subscription = useSubscription();
  const signedIn = session !== null && session !== "loading";
  const scanOffer = source === "body-scan" || source === "face-scan";
  const faceScanOffer = source === "face-scan";
  const [selected, setSelected] = useState<Plan>("yearly");
  const [purchasing, setPurchasing] = useState(false);
  const [referral, setReferral] = useState(profile?.referralCode ?? "");
  const [referralApplied, setReferralApplied] = useState(!!profile?.referralCode);
  const [referralSaving, setReferralSaving] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [checkpoint] = useState(() => getOnboardingPaywallCheckpoint());
  const returningUser = Boolean(checkpoint?.lastVisitedAt);

  useEffect(() => {
    markOnboardingPaywallVisited();
  }, []);

  useEffect(() => {
    if (signedIn) setAccountDialogOpen(false);
  }, [signedIn]);

  useEffect(() => {
    const firstAvailablePlan = (["yearly", "monthly", "weekly"] as const).find(
      (plan) => subscription.availablePlans[plan],
    );
    if (firstAvailablePlan && !subscription.availablePlans[selected]) {
      setSelected(firstAvailablePlan);
    }
  }, [selected, subscription.availablePlans]);

  const continueAfterUnlock = useCallback(() => {
    clearOnboardingResume();
    const resumePath = consumeSubscriptionResumePath();
    if (resumePath) {
      window.location.assign(resumePath);
      return;
    }
    if (scanOffer) {
      if (faceScanOffer) {
        navigate({ to: "/scan/face", search: { pending: "onboarding" } });
      } else {
        navigate({ to: "/scan/body/new", search: { pending: "onboarding" } });
      }
    } else {
      navigate({ to: "/home" });
    }
  }, [faceScanOffer, navigate, scanOffer]);

  useEffect(() => {
    if (signedIn && subscription.ready && subscription.active) {
      continueAfterUnlock();
    }
  }, [continueAfterUnlock, signedIn, subscription.active, subscription.ready]);

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

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const nextSubscription = await purchaseSubscription(selected);
      if (nextSubscription.active && signedIn) continueAfterUnlock();
      else if (nextSubscription.active) setAccountDialogOpen(true);
      else alert("Your purchase did not unlock Ascendr Pro. Please try restoring your purchases.");
    } catch (error) {
      if (!isPurchaseCancelled(error)) {
        alert(
          error instanceof Error
            ? error.message
            : "We couldn't complete your purchase. Please try again.",
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const nextSubscription = await restorePurchases();
      if (nextSubscription.active && signedIn) continueAfterUnlock();
      else if (nextSubscription.active) setAccountDialogOpen(true);
      else alert("No previous purchases found.");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "We couldn't restore your purchases. Please try again.",
      );
    } finally {
      setPurchasing(false);
    }
  };

  const purchaseUnavailable =
    !subscription.ready || !subscription.availablePlans[selected] || Boolean(subscription.error);
  const revenueCatPurchaseStatus =
    subscription.error ??
    (!subscription.ready
      ? "Loading secure checkout…"
      : !subscription.availablePlans[selected]
        ? "This subscription option is not available."
        : null);
  const purchaseStatus = subscription.renewalRequired
    ? "Your subscription has ended. Renew to restore access to your saved data."
    : revenueCatPurchaseStatus;

  if (source === "body-scan") {
    return (
      <>
        <BodyScanPaywall
          selected={selected}
          purchasing={purchasing}
          referral={referral}
          referralApplied={referralApplied}
          referralSaving={referralSaving}
          returningName={returningUser ? checkpoint?.name : undefined}
          onSelect={setSelected}
          onReferralChange={(value) => {
            setReferral(value.toUpperCase());
            setReferralApplied(false);
          }}
          onApplyReferral={() => void applyReferral()}
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          onClose={() => navigate({ to: "/home" })}
          prices={subscription.prices}
          purchaseUnavailable={purchaseUnavailable}
          purchaseStatus={purchaseStatus}
          subscriptionReady={subscription.ready}
          accountRequired={!signedIn}
          renewalRequired={subscription.renewalRequired}
        />
        <PurchaseAccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} />
      </>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_-10%,rgba(183,255,62,0.17),transparent_42%),linear-gradient(180deg,#10180d_0%,#0a0d0a_42%,#090b0a_100%)] text-foreground">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-neon/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-neon/10 blur-3xl" />

      <main
        className="relative mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto overscroll-contain px-4 pb-6"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {/* Brand bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AscendrLogo className="size-10 rounded-[13px] border border-white/10 shadow-[0_10px_24px_-12px_var(--color-neon)]" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neon">Ascendr</p>
              <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">
                Premium training system
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/home" })}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-white/20 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-6 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018)_55%,rgba(183,255,62,0.08))] p-5 shadow-[0_24px_65px_-42px_rgba(0,0,0,0.98)]"
        >
          <div className="pointer-events-none absolute -right-12 -top-14 size-44 rounded-full bg-neon/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-neon">
              <Sparkles className="size-3.5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                {scanOffer ? `Ascendr ${faceScanOffer ? "Face" : "Body"} Scan` : APP_NAME}
              </span>
            </div>

            <h1 className="mt-4 text-[clamp(2rem,9vw,2.65rem)] font-black leading-[0.98] tracking-[-0.055em]">
              {scanOffer ? (
                <>
                  Your Analysis Is <span className="text-neon">Ready.</span>
                </>
              ) : (
                <>
                  Unlock Your <span className="text-neon">Best Body.</span>
                </>
              )}
            </h1>
            <p className="mt-3 max-w-[35ch] text-[13px] leading-relaxed text-muted-foreground">
              {scanOffer
                ? faceScanOffer
                  ? "Reveal your appearance score, symmetry, skin, eye-area, looksmax potential, and personal action plan."
                  : "Reveal your physique score, muscle development, symmetry, body-fat range, potential, and personal action plan."
                : "Your adaptive workouts, nutrition, and progress intelligence—one system built to keep you moving forward."}
            </p>

            {scanOffer && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neon/20 bg-black/20 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon text-neon-foreground">
                  <Scan className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold">Your private AI report is complete</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                    Subscribe to reveal every score, insight, and next step.
                  </p>
                </div>
              </div>
            )}

            {!scanOffer && (
              <div className="mt-5 grid grid-cols-3 divide-x divide-white/[0.09] rounded-2xl border border-white/[0.09] bg-black/20 py-3">
                <div className="px-2 text-center">
                  <Dumbbell className="mx-auto size-3.5 text-neon" />
                  <p className="mt-1.5 text-[9px] font-bold text-white/80">Train smarter</p>
                </div>
                <div className="px-2 text-center">
                  <Apple className="mx-auto size-3.5 text-neon" />
                  <p className="mt-1.5 text-[9px] font-bold text-white/80">Fuel with clarity</p>
                </div>
                <div className="px-2 text-center">
                  <LineChart className="mx-auto size-3.5 text-neon" />
                  <p className="mt-1.5 text-[9px] font-bold text-white/80">See progress</p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {returningUser && checkpoint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-neon/20 bg-neon/[0.07] px-4 py-3"
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

        {/* Social proof */}
        <div className="mt-4 flex items-center gap-3 px-1">
          <div className="flex -space-x-2">
            {COMMUNITY_AVATARS.map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="size-7 rounded-full border-2 border-background object-cover shadow-sm shadow-black/40"
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

        {/* Plan selection */}
        <div className="mt-6 flex items-end justify-between px-1">
          <div>
            <p className="text-sm font-black">Choose your membership</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Full access, cancel whenever you need.
            </p>
          </div>
          <span className="rounded-full border border-neon/20 bg-neon/[0.06] px-2.5 py-1 text-[9px] font-bold text-neon">
            Best value yearly
          </span>
        </div>
        <div className="mt-3 space-y-2.5">
          <PlanCard
            plan="yearly"
            price={subscription.prices.yearly}
            selected={selected === "yearly"}
            onSelect={() => setSelected("yearly")}
          />
          <PlanCard
            plan="monthly"
            price={subscription.prices.monthly}
            selected={selected === "monthly"}
            onSelect={() => setSelected("monthly")}
          />
          <PlanCard
            plan="weekly"
            price={subscription.prices.weekly}
            selected={selected === "weekly"}
            onSelect={() => setSelected("weekly")}
          />
        </div>
        <p className="mt-3 px-2 text-center text-[10px] leading-snug text-muted-foreground/70">
          Subscription auto-renews until canceled at least 24 hours before the end of the current
          period. Manage it in your App Store account settings.
        </p>

        {/* Optional referral code stays compact until the user needs it. */}
        <details className="group mt-4 rounded-2xl border border-white/10 bg-white/[0.03]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-neon/20 bg-neon/10 text-neon">
              <Tag className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">Referral code</p>
              <p className="text-[9px] text-muted-foreground">Optional creator or friend code</p>
            </div>
            <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-2">
              <input
                value={referral}
                onChange={(event) => {
                  setReferral(event.target.value.toUpperCase());
                  setReferralApplied(false);
                }}
                placeholder="ENTER CODE"
                maxLength={24}
                aria-label="Referral code"
                className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-black/20 px-3 text-xs font-semibold tracking-widest uppercase outline-none focus:border-neon/40"
              />
              <button
                type="button"
                onClick={() => void applyReferral()}
                disabled={!referral.trim() || referralSaving}
                className={cn(
                  "h-10 rounded-xl px-4 text-xs font-semibold transition",
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
        </details>

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
      </main>

      {/* In-flow footer keeps checkout actions visible without covering content. */}
      <div
        className="relative z-10 shrink-0 border-t border-white/[0.06] bg-background/95 px-4 pt-2 backdrop-blur-xl"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-md">
          <button
            onClick={handlePurchase}
            disabled={purchasing || purchaseUnavailable}
            className={cn(
              "h-12 w-full rounded-2xl bg-neon text-sm font-bold text-neon-foreground",
              "shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--neon)_60%,transparent)]",
              "flex items-center justify-center gap-2 active:scale-[0.98] transition",
              (purchasing || purchaseUnavailable) && "opacity-70",
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
            Cancel anytime · {subscription.prices[selected].price}
            {subscription.prices[selected].per}
          </p>
          {purchaseStatus && (
            <p className="mt-1 text-center text-[10px] text-muted-foreground">{purchaseStatus}</p>
          )}
          <div className="mt-2.5 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <button
              onClick={handleRestore}
              disabled={purchasing || !subscription.ready}
              className="hover:text-foreground disabled:opacity-50"
            >
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
      <PurchaseAccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} />
    </div>
  );
}

interface BodyScanPaywallProps {
  selected: Plan;
  purchasing: boolean;
  referral: string;
  referralApplied: boolean;
  referralSaving: boolean;
  returningName?: string;
  onSelect: (plan: Plan) => void;
  onReferralChange: (value: string) => void;
  onApplyReferral: () => void;
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
  prices: PlanPrices;
  purchaseUnavailable: boolean;
  purchaseStatus: string | null;
  subscriptionReady: boolean;
  accountRequired: boolean;
  renewalRequired: boolean;
}

function BodyScanPaywall({
  selected,
  purchasing,
  referral,
  referralApplied,
  referralSaving,
  returningName,
  onSelect,
  onReferralChange,
  onApplyReferral,
  onPurchase,
  onRestore,
  onClose,
  prices,
  purchaseUnavailable,
  purchaseStatus,
  subscriptionReady,
  accountRequired,
  renewalRequired,
}: BodyScanPaywallProps) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-neon/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-0 size-64 rounded-full bg-neon/[0.07] blur-3xl" />

      <header
        className="relative mx-auto flex w-full max-w-md shrink-0 items-center justify-between px-4 pb-1"
        style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 text-neon">
          <span className="grid size-8 place-items-center rounded-xl border border-neon/20 bg-neon/10">
            <Scan className="size-4" />
          </span>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em]">Ascendr Vision</p>
            <p className="text-[10px] font-semibold text-white/65">Body Scan unlock</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <main className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-2 pt-1">
        <h1 className="text-[clamp(1.7rem,8vw,2.2rem)] font-black leading-[0.98] tracking-[-0.05em]">
          Your Body Scan Is <span className="text-neon">Ready to Unlock</span>
        </h1>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Choose a plan to run the private AI analysis and reveal every score and recommendation.
        </p>

        <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-neon/20 bg-neon/[0.06] px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon/10 text-neon">
            <LockKeyhole className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold">
              {returningName ? `${returningName}, your photo is saved` : "Your photo is saved"}
            </p>
            <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
              Analysis starts only after purchase or restore.
            </p>
          </div>
          <span className="rounded-full border border-neon/20 bg-black/20 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-neon">
            Private
          </span>
        </div>

        {renewalRequired && !accountRequired && (
          <p className="mt-3 rounded-2xl border border-neon/25 bg-neon/[0.08] px-3 py-2 text-center text-[10px] font-semibold text-neon">
            Your subscription has ended. Renew to restore your saved scan and progress.
          </p>
        )}

        <div className="mt-2.5 grid gap-1.5">
          <PlanCard
            plan="yearly"
            price={prices.yearly}
            selected={selected === "yearly"}
            onSelect={() => onSelect("yearly")}
            compact
          />
          <PlanCard
            plan="monthly"
            price={prices.monthly}
            selected={selected === "monthly"}
            onSelect={() => onSelect("monthly")}
            compact
          />
          <PlanCard
            plan="weekly"
            price={prices.weekly}
            selected={selected === "weekly"}
            onSelect={() => onSelect("weekly")}
            compact
          />
        </div>

        <p className="mt-1.5 px-1 text-center text-[8px] leading-snug text-muted-foreground/70">
          Auto-renews until canceled at least 24 hours before the current period ends.
        </p>

        <details className="group mt-1.5 rounded-xl border border-white/[0.07] bg-white/[0.025]">
          <summary className="flex h-8 cursor-pointer list-none items-center gap-2 px-3 text-[10px] font-semibold text-white/65">
            <Tag className="size-3 text-neon" /> Referral code
            <span className="ml-auto text-[8px] font-medium text-muted-foreground">Optional</span>
            <ChevronDown className="size-3 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/[0.06] p-2.5">
            <div className="flex items-center gap-2">
              <input
                value={referral}
                onChange={(event) => onReferralChange(event.target.value)}
                placeholder="ENTER CODE"
                maxLength={24}
                aria-label="Referral code"
                className="h-9 min-w-0 flex-1 rounded-lg border border-white/[0.07] bg-black/20 px-3 text-[11px] font-semibold tracking-widest uppercase outline-none focus:border-neon/40"
              />
              <button
                type="button"
                onClick={onApplyReferral}
                disabled={!referral.trim() || referralSaving}
                className={cn(
                  "h-9 rounded-lg px-3 text-[10px] font-bold transition",
                  referral.trim() && !referralSaving
                    ? "bg-neon text-neon-foreground"
                    : "bg-white/[0.05] text-muted-foreground",
                )}
              >
                {referralSaving ? "Saving…" : "Apply"}
              </button>
            </div>
            {referralApplied && (
              <p className="mt-2 flex items-center gap-1.5 text-[9px] font-semibold text-neon">
                <Check className="size-3" /> Code saved
              </p>
            )}
          </div>
        </details>
      </main>

      <footer
        className="relative z-10 shrink-0 border-t border-white/[0.06] bg-background/95 px-4 pt-2 backdrop-blur-xl"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={onPurchase}
            disabled={purchasing || purchaseUnavailable}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-neon text-sm font-black text-neon-foreground shadow-[0_10px_34px_-14px_var(--neon)] transition active:scale-[0.98]",
              (purchasing || purchaseUnavailable) && "opacity-70",
            )}
          >
            {purchasing ? "Processing…" : "Unlock My Body Scan"}
            {!purchasing && <ArrowRight className="size-4" />}
          </button>
          <div className="mt-1.5 flex items-center justify-between gap-3 text-[9px] text-muted-foreground">
            <span>
              Cancel anytime · {prices[selected].price}
              {prices[selected].per}
            </span>
            <button
              type="button"
              onClick={onRestore}
              disabled={purchasing || !subscriptionReady}
              className="shrink-0 hover:text-foreground disabled:opacity-50"
            >
              Restore Purchases
            </button>
          </div>
          {purchaseStatus && (
            <p className="mt-1 text-center text-[9px] text-muted-foreground">{purchaseStatus}</p>
          )}
          <div className="mt-1 flex items-center justify-center gap-3 text-[9px] text-muted-foreground">
            <a href="/terms" className="hover:text-foreground">
              Terms
            </a>
            <span className="opacity-40">·</span>
            <a href="/privacy" className="hover:text-foreground">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PurchaseAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neon/20 bg-background p-3 sm:p-4">
        <SoftAccountPrompt
          title="Create your account to access Premium"
          description="Your Apple subscription is ready. Sign in to securely connect it to your private Ascendr account."
          redirectPath="/paywall"
          storageKey="ascendr-paywall-account"
          dismissible={false}
          primaryLabel="Sign in or create account"
          initialExpanded
          initialMode="signup"
          onSignedIn={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
function PlanCard({
  plan,
  price,
  selected,
  onSelect,
  compact = false,
}: {
  plan: Plan;
  price: PlanPrices[Plan];
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const p = price;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full border text-left transition-all duration-200",
        compact ? "rounded-2xl px-3 py-2" : "rounded-[1.45rem] px-4 py-4",
        selected
          ? "border-neon/80 bg-[linear-gradient(110deg,rgba(183,255,62,0.14),rgba(183,255,62,0.055)_50%,rgba(255,255,255,0.04))] shadow-[0_0_0_1px_rgba(183,255,62,0.25),0_16px_34px_-22px_rgba(183,255,62,0.8)]"
          : "border-white/[0.1] bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.045]",
      )}
    >
      {p.badge && (
        <span
          className={cn(
            "absolute top-0 -translate-y-1/2 whitespace-nowrap rounded-full bg-neon font-bold tracking-wider text-neon-foreground",
            compact ? "right-3 px-1.5 py-px text-[7px]" : "right-4 px-2.5 py-1 text-[9px]",
          )}
        >
          {p.badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-full border-2 transition",
            compact ? "size-4" : "size-5",
            selected ? "border-neon bg-neon" : "border-white/30",
          )}
        >
          {selected && <Check className="h-3 w-3 text-neon-foreground" strokeWidth={3} />}
        </div>
        <div className="min-w-0 flex-1">
          <span className={cn("font-bold", compact ? "text-xs" : "text-[15px]")}>{p.label}</span>
          <p
            className={cn(
              "leading-tight text-muted-foreground",
              compact ? "mt-px text-[8px]" : "mt-1 text-[10px]",
            )}
          >
            {p.subtitle}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span
            className={cn(
              "font-black leading-none tracking-[-0.04em]",
              compact ? "text-sm" : "text-xl",
            )}
          >
            {p.price}
          </span>
          <span
            className={cn(
              "ml-0.5 font-medium text-muted-foreground",
              compact ? "text-[8px]" : "text-[10px]",
            )}
          >
            {p.per}
          </span>
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
