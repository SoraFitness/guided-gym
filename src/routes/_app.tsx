import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Dumbbell, Apple, ScanLine, User } from "lucide-react";
import { useProfile } from "@/lib/profile";
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
  { to: "/scan", label: "Scan", Icon: ScanLine },
  { to: "/nutrition", label: "Nutrition", Icon: Apple },
  { to: "/profile", label: "Profile", Icon: User },
] as const;


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
    pathname.startsWith("/scan/body/");

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex-1 pb-24">
        <Outlet />
      </div>
      {!hideTabs && (
        <nav className="fixed bottom-0 inset-x-0 px-4 pb-5 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="mx-auto max-w-md bg-surface/90 backdrop-blur rounded-full border border-border h-16 px-2 flex items-center justify-between gap-1">
            {tabs.map(({ to, label, Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  className={cn(
                    "flex-1 h-12 rounded-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition",
                    active ? "bg-neon text-neon-foreground" : "text-muted-foreground"
                  )}
                >
                  <Icon className="size-5" />
                  <span className={cn(active ? "opacity-100" : "opacity-70")}>{label}</span>
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

