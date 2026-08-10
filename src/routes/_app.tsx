import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Dumbbell, Apple, User, Sparkles, ScanLine } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { useAuthSession } from "@/lib/authSession";
import { startCloudSync } from "@/lib/cloudSync";
import { cn } from "@/lib/utils";
import { AppTour } from "@/components/tour/AppTour";
import { TOUR_STEPS } from "@/lib/tourSteps";
import { markTourCompleted, useTourCompleted } from "@/lib/tourStore";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const tabs = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/workouts", label: "Workouts", Icon: Dumbbell },
  { to: "/coach", label: "Coach", Icon: Sparkles },
  { to: "/nutrition", label: "Nutrition", Icon: Apple },
  { to: "/scan", label: "Scans", Icon: ScanLine },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

// Runs the localStorage <-> Supabase sync engine while a user is signed in.
function CloudSyncGate() {
  const session = useAuthSession();
  const userId = session && session !== "loading" ? session.userId : null;

  useEffect(() => {
    if (!userId) return;
    return startCloudSync(userId);
  }, [userId]);

  return null;
}

function AppShell() {
  const { profile, ready } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tourCompleted = useTourCompleted();
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/onboarding" });
  }, [ready, profile, navigate]);

  // auto-open tour the first time the user lands in the app with a profile
  useEffect(() => {
    if (ready && profile && !tourCompleted && !tourOpen) {
      setTourOpen(true);
    }
  }, [ready, profile, tourCompleted, tourOpen]);

  const hideTabs =
    pathname.startsWith("/workout/") ||
    pathname.startsWith("/scan/body/new") ||
    pathname.startsWith("/scan/body/") ||
    pathname.startsWith("/scan/face");

  return (
    <div className="app-shell flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background">
      <CloudSyncGate />
      <div
        className="app-shell__content min-w-0 flex-1"
        style={{
          paddingTop: hideTabs ? 0 : "env(safe-area-inset-top)",
          paddingBottom: hideTabs
            ? 0
            : "calc(env(safe-area-inset-bottom) + 5.25rem)",
        }}
      >
        <div className="mx-auto w-full min-w-0 max-w-md overflow-x-clip">
          <Outlet />
        </div>
      </div>
      {!hideTabs && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-background via-background/95 to-transparent pt-2"
          style={{
            paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
          }}
        >
          <div className="mx-auto flex h-[58px] max-w-md items-center justify-between gap-0.5 rounded-full border border-border bg-surface/90 px-1.5 shadow-[0_18px_42px_-20px_black] backdrop-blur">
            {tabs.map(({ to, label, Icon }) => {
              const active =
                pathname === to ||
                pathname.startsWith(`${to}/`) ||
                (to === "/profile" && pathname.startsWith("/photos"));
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  className={cn(
                    "tap flex h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[9px] font-medium transition",
                    active ? "bg-neon text-neon-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span
                    className={cn(
                      "max-w-full truncate px-0.5",
                      active ? "opacity-100" : "opacity-70",
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
