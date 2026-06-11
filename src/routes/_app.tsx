import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, Dumbbell, Apple, BarChart3, User } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const tabs = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/workouts", label: "Workouts", Icon: Dumbbell },
  { to: "/nutrition", label: "Nutrition", Icon: Apple },
  { to: "/progress", label: "Progress", Icon: BarChart3 },
  { to: "/profile", label: "Profile", Icon: User },
] as const;


function AppShell() {
  const { profile, ready } = useProfile();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/onboarding" });
  }, [ready, profile, navigate]);

  const hideTabs = pathname.startsWith("/workout/");

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
    </div>
  );
}
