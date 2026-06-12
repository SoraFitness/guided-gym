import {
  Home,
  Apple,
  BarChart3,
  Dumbbell,
  Calendar,
  ScanLine,
  User,
  Sparkles,
  Box,
  Play,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TourStep {
  id: string;
  targetId?: string;
  title: string;
  body: string;
  icon: LucideIcon;
  route?: "/home" | "/workouts" | "/scan" | "/nutrition" | "/profile";
  placement?: "top" | "bottom" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Pulse",
    body: "A 60-second tour of everything you can do — your workouts, nutrition, scans, and progress.",
    icon: Sparkles,
    placement: "center",
    route: "/home",
  },
  {
    id: "home",
    targetId: "tour-home-header",
    title: "Your home base",
    body: "A quick snapshot of today — your focus, your plan, and what to do next.",
    icon: Home,
    route: "/home",
    placement: "bottom",
  },
  {
    id: "nutrition-card",
    targetId: "tour-nutrition-card",
    title: "Today's nutrition",
    body: "Track calories and macros at a glance. Tap Open to log meals or scan food.",
    icon: Apple,
    route: "/home",
    placement: "bottom",
  },
  {
    id: "progress",
    targetId: "tour-progress-card",
    title: "Activity & streaks",
    body: "Minutes trained today, weekly count, and your current streak — your momentum, visualized.",
    icon: BarChart3,
    route: "/home",
    placement: "bottom",
  },
  {
    id: "start-workout",
    targetId: "tour-today-workout",
    title: "Start today's workout",
    body: "Tap a workout to see the plan, then hit Start Workout to enter your guided session.",
    icon: Play,
    route: "/home",
    placement: "top",
  },
  {
    id: "workouts-plan",
    targetId: "tour-workouts-plan",
    title: "Weekly schedule",
    body: "Your training week, balanced around rest. Rebuild it any time to refresh your plan.",
    icon: Calendar,
    route: "/workouts",
    placement: "bottom",
  },
  {
    id: "3d-demo",
    targetId: "tour-workouts-tabs",
    title: "3D exercise demos",
    body: "Inside any workout, a realistic 3D trainer shows perfect form for every exercise.",
    icon: Box,
    route: "/workouts",
    placement: "bottom",
  },
  {
    id: "bodyscan",
    targetId: "tour-bodyscan",
    title: "AI Body Scan",
    body: "Snap a photo to rate posture, symmetry, and definition — and get a tailored plan.",
    icon: ScanLine,
    route: "/scan",
    placement: "bottom",
  },
  {
    id: "nutrition-log",
    targetId: "tour-nutrition-log",
    title: "Log a meal in seconds",
    body: "Scan a barcode, snap a photo, search, or log manually. Macros update live.",
    icon: Apple,
    route: "/nutrition",
    placement: "top",
  },
  {
    id: "profile",
    targetId: "tour-profile-settings",
    title: "Profile & settings",
    body: "Tweak your goals, units, and nutrition targets. You can restart this tour from here any time.",
    icon: User,
    route: "/profile",
    placement: "top",
  },
];
