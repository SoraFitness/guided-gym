import {
  createFileRoute,
  Outlet,
  Link,
  useRouterState,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { House, Dumbbell, Utensils, MessageSquare, ChartSpline, ScanFace } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import { startCloudSync } from "@/lib/cloudSync";
import { claimLocalDataOwnership, localDataBelongsToAccount } from "@/lib/accountOwnership";
import { useCloudProfileRestore } from "@/lib/cloudProfileRestore";
import { useSubscription } from "@/lib/subscription";
import { subscriptionNotice } from "@/lib/subscriptionState";
import { SubscriptionNoticeBanner } from "@/components/SubscriptionNoticeBanner";
import { saveSubscriptionResumePath } from "@/lib/subscriptionResume";
import { cn } from "@/lib/utils";
import { AppTour } from "@/components/tour/AppTour";
import { TOUR_STEPS } from "@/lib/tourSteps";
import { markTourCompleted, useTourCompleted } from "@/lib/tourStore";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const tabs = [
  { to: "/home", label: "Home", Icon: House },
  { to: "/workouts", label: "Train", Icon: Dumbbell },
  { to: "/nutrition", label: "Fuel", Icon: Utensils },
  { to: "/scan", label: "Scan", Icon: ScanFace },
  { to: "/coach", label: "Coach", Icon: MessageSquare },
  { to: "/progress", label: "Progress", Icon: ChartSpline },
] as const;

const SUBSCRIPTION_EXEMPT_PATHS = new Set([
  "/contact",
  "/delete-account",
  "/health-disclaimer",
  "/privacy",
  "/terms",
]);
const STARTUP_RECOVERY_TIMEOUT_MS = 20_000;

function CloudSyncGate({ userId }: { userId: string }) {
  useEffect(() => {
    if (claimLocalDataOwnership(userId)) {
      window.location.reload();
      return;
    }
    return startCloudSync(userId);
  }, [userId]);

  return null;
}

function AccessGate({ message }: { message: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-muted border-t-neon" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function AppShell() {
  const { profile, ready } = useProfile();
  const session = useAuthSession();
  const subscription = useSubscription();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tourCompleted = useTourCompleted();
  const [tourOpen, setTourOpen] = useState(false);
  const subscriptionExempt = SUBSCRIPTION_EXEMPT_PATHS.has(pathname);
  const accountUserId = isAccountSession(session) ? session.userId : null;
  const signedIn = accountUserId !== null;
  const subscriptionMatchesAccount = signedIn && subscription.customerUserId === accountUserId;
  const localDataOwnerMatches = accountUserId ? localDataBelongsToAccount(accountUserId) : false;
  const profileRestore = useCloudProfileRestore(session, profile, ready);
  const hasPremiumAccess =
    signedIn &&
    subscriptionMatchesAccount &&
    localDataOwnerMatches &&
    ready &&
    Boolean(profile) &&
    subscription.ready &&
    subscription.active;

  useEffect(() => {
    if (subscriptionExempt || !ready) return;
    if (!profile) {
      // Signed-in members get their saved profile back before onboarding is considered.
      if (!profileRestore.pending) navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!subscription.ready || session === "loading" || (signedIn && !subscriptionMatchesAccount)) {
      return;
    }
    if (!subscription.active) {
      const resumePath =
        typeof window === "undefined"
          ? pathname
          : `${window.location.pathname}${window.location.search}`;
      saveSubscriptionResumePath(resumePath);
      navigate({ to: "/paywall", search: { source: undefined }, replace: true });
      return;
    }
    if (!signedIn) {
      const next =
        typeof window === "undefined"
          ? pathname
          : `${window.location.pathname}${window.location.search}`;
      navigate({ to: "/account", search: { next }, replace: true });
    }
  }, [
    navigate,
    pathname,
    profile,
    profileRestore.pending,
    ready,
    session,
    signedIn,
    subscription.active,
    subscription.customerUserId,
    subscriptionMatchesAccount,
    subscription.ready,
    subscriptionExempt,
  ]);

  useEffect(() => {
    if (subscriptionExempt || (ready && subscription.ready && session !== "loading")) return;

    const timeoutId = window.setTimeout(() => {
      if (profile) {
        navigate({ to: "/paywall", search: { source: undefined }, replace: true });
      } else {
        navigate({ to: "/onboarding", replace: true });
      }
    }, STARTUP_RECOVERY_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, profile, ready, session, subscription.ready, subscriptionExempt]);

  // Fetch every tab's code once the app is idle, so switching tabs is instant.
  useEffect(() => {
    if (!hasPremiumAccess) return;
    const timeoutId = window.setTimeout(() => {
      for (const tab of tabs) {
        void Promise.resolve(router.preloadRoute({ to: tab.to })).catch(() => undefined);
      }
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [hasPremiumAccess, router]);

  // auto-open tour the first time the user lands in the app with a profile
  useEffect(() => {
    if (ready && profile && pathname === "/home" && !tourCompleted && !tourOpen) {
      setTourOpen(true);
    }
  }, [ready, profile, pathname, tourCompleted, tourOpen]);

  const notice = subscriptionNotice(subscription);
  const hideTabs =
    subscriptionExempt ||
    pathname.startsWith("/workout/") ||
    pathname.startsWith("/scan/body/new") ||
    pathname.startsWith("/scan/body/") ||
    pathname.startsWith("/scan/face");

  if (!subscriptionExempt && !hasPremiumAccess) {
    const message =
      session === "loading" || !ready
        ? "Loading Ascendr..."
        : signedIn && !subscriptionMatchesAccount
          ? "Checking your subscription..."
          : signedIn && !localDataOwnerMatches
            ? "Securing this device for your account..."
            : !profile
              ? profileRestore.pending
                ? "Restoring your fitness profile..."
                : "Preparing your private fitness profile..."
              : !subscription.ready
                ? "Checking your subscription..."
                : subscription.renewalRequired
                  ? "Your subscription has ended. Taking you to renew..."
                  : "An active subscription is required to continue.";

    return (
      <>
        {accountUserId && subscription.ready && subscription.active && (
          <CloudSyncGate userId={accountUserId} />
        )}
        <AccessGate message={message} />
      </>
    );
  }

  return (
    <div className="app-shell flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background">
      {hasPremiumAccess && accountUserId && <CloudSyncGate userId={accountUserId} />}
      <div
        className="app-shell__content relative isolate min-w-0 flex-1"
        style={{
          paddingTop: hideTabs ? 0 : "env(safe-area-inset-top)",
          paddingBottom: hideTabs ? 0 : "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        <div className="mx-auto w-full min-w-0 max-w-md overflow-x-clip">
          {pathname === "/home" && notice && <SubscriptionNoticeBanner notice={notice} />}
          <Outlet />
        </div>
      </div>
      {!hideTabs && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40"
          style={{
            paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(0.625rem, env(safe-area-inset-left))",
            paddingRight: "max(0.625rem, env(safe-area-inset-right))",
          }}
        >
          <div className="relative mx-auto flex max-w-md items-stretch justify-between rounded-[24px] border border-hairline bg-[color:var(--surface-glass)] px-1 shadow-[0_18px_44px_-16px_black] backdrop-blur-xl">
            {tabs.map(({ to, label, Icon }) => {
              const active =
                pathname === to ||
                pathname.startsWith(`${to}/`) ||
                (to === "/progress" && pathname.startsWith("/photos"));
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className="tap relative flex min-w-0 flex-1 flex-col items-center gap-1 pb-2 pt-2.5"
                >
                  {active && (
                    <motion.span
                      layoutId="dock-marker"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute -top-px left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-b-full bg-neon"
                    />
                  )}
                  <Icon
                    className={cn(
                      "size-[22px] transition-colors duration-300",
                      active ? "text-neon" : "text-muted-foreground",
                    )}
                    strokeWidth={active ? 2.3 : 1.8}
                  />
                  <span
                    className={cn(
                      "max-w-full truncate px-0.5 text-[11px] font-semibold transition-colors",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <AppTour
        open={tourOpen}
        steps={TOUR_STEPS}
        onClose={(completed) => {
          if (completed) markTourCompleted();
          setTourOpen(false);
        }}
      />
    </div>
  );
}
