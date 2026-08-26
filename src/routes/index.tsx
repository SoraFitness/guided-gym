import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile";
import { getOnboardingPaywallCheckpoint } from "@/lib/onboardingResume";
import { useSubscription } from "@/lib/subscription";
import { isAccountSession, useAuthSession } from "@/lib/authSession";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

const STARTUP_RECOVERY_TIMEOUT_MS = 20_000;

function IndexRedirect() {
  const navigate = useNavigate();
  const { profile, ready } = useProfile();
  const subscription = useSubscription();
  const session = useAuthSession();
  const [startupTimedOut, setStartupTimedOut] = useState(false);

  useEffect(() => {
    if (ready && subscription.ready && session !== "loading") return;

    const timeoutId = window.setTimeout(() => {
      setStartupTimedOut(true);
    }, STARTUP_RECOVERY_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [ready, session, subscription.ready]);

  useEffect(() => {
    if (startupTimedOut) {
      if (profile) {
        navigate({ to: "/paywall", search: { source: undefined }, replace: true });
      } else {
        navigate({ to: "/onboarding", replace: true });
      }
      return;
    }

    if (!ready || !subscription.ready || session === "loading") return;
    if (profile && subscription.active && !isAccountSession(session)) {
      navigate({ to: "/account", search: { next: "/home" }, replace: true });
      return;
    }
    if (profile && subscription.active) {
      navigate({ to: "/home", replace: true });
      return;
    }
    const checkpoint = getOnboardingPaywallCheckpoint();
    if (checkpoint && !subscription.active) {
      navigate({
        to: "/paywall",
        search: { source: checkpoint.source ?? undefined },
        replace: true,
      });
      return;
    }
    navigate({ to: profile ? "/home" : "/onboarding", replace: true });
  }, [ready, profile, navigate, session, startupTimedOut, subscription.active, subscription.ready]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="size-8 rounded-full border-2 border-muted border-t-neon animate-spin" />
    </div>
  );
}
