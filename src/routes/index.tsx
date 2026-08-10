import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useProfile } from "@/lib/profile";
import { getOnboardingPaywallCheckpoint } from "@/lib/onboardingResume";
import { getSubscription } from "@/lib/subscription";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const { profile, ready } = useProfile();

  useEffect(() => {
    if (!ready) return;
    const checkpoint = getOnboardingPaywallCheckpoint();
    if (checkpoint && !getSubscription().active) {
      navigate({
        to: "/paywall",
        search: checkpoint.source ? { source: checkpoint.source } : {},
        replace: true,
      });
      return;
    }
    navigate({ to: profile ? "/home" : "/onboarding", replace: true });
  }, [ready, profile, navigate]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="size-8 rounded-full border-2 border-muted border-t-neon animate-spin" />
    </div>
  );
}
