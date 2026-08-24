import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useProfile } from "@/lib/profile";
import { getOnboardingPaywallCheckpoint } from "@/lib/onboardingResume";
import { useSubscription } from "@/lib/subscription";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { profile, ready } = useProfile();
  const subscription = useSubscription();

  useEffect(() => {
    if (!ready || !subscription.ready) return;
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
  }, [ready, profile, navigate, subscription.active, subscription.ready]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="size-8 rounded-full border-2 border-muted border-t-neon animate-spin" />
    </div>
  );
}
