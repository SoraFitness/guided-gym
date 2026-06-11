import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const hasProfile = !!localStorage.getItem("fitness:profile");
      throw redirect({ to: hasProfile ? "/home" : "/onboarding" });
    }
  },
  component: () => null,
});
