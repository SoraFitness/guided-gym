import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { WorkoutSplitId } from "./workoutSplits";

export type Goal =
  | "lose_weight"
  | "build_muscle"
  | "recomp"
  | "endurance"
  | "maintain"
  | "get_stronger"
  | "overall";
export type Gender = "male" | "female" | "other";
export type DemoModelPreference = "auto" | "male" | "female";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentSetup = "none" | "dumbbells" | "gym" | "mixed";
export type FocusArea =
  | "chest"
  | "back"
  | "legs"
  | "glutes"
  | "arms"
  | "core"
  | "cardio"
  | "mobility";
export type NutritionPlan = "fat_loss" | "muscle_gain" | "maintenance" | "custom";

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: "Lose weight",
  build_muscle: "Build muscle",
  recomp: "Body recomposition",
  endurance: "Improve endurance",
  maintain: "Maintain weight",
  get_stronger: "Get stronger",
  overall: "Improve overall fitness",
};
export const GOAL_OPTIONS: Goal[] = [
  "lose_weight",
  "build_muscle",
  "maintain",
  "get_stronger",
  "endurance",
  "overall",
];

export function getProfileGoals(profile: Pick<Profile, "goal" | "goals">): Goal[] {
  return profile.goals?.length ? [...new Set(profile.goals)] : [profile.goal];
}
export const EQUIPMENT_LABELS: Record<EquipmentSetup, string> = {
  none: "Home · no equipment",
  dumbbells: "Dumbbells only",
  gym: "Full gym",
  mixed: "Mixed setup",
};
export const EQUIPMENT_OPTIONS = [
  "No equipment",
  "Dumbbells",
  "Barbell",
  "Resistance bands",
  "Machines",
  "Kettlebells",
  "Bench",
  "Pull-up bar",
  "Full gym access",
] as const;
export type EquipmentItem = (typeof EQUIPMENT_OPTIONS)[number];

export function deriveEquipmentSetup(items: string[]): EquipmentSetup {
  if (!items.length || (items.length === 1 && items[0] === "No equipment")) return "none";
  if (items.includes("Full gym access")) return "gym";
  if (items.length === 1 && items[0] === "Dumbbells") return "dumbbells";
  return "mixed";
}
export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
export const NUTRITION_LABELS: Record<NutritionPlan, string> = {
  fat_loss: "Fat loss",
  muscle_gain: "Muscle gain",
  maintenance: "Maintenance",
  custom: "Custom",
};
export const FOCUS_LABELS: Record<FocusArea, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  glutes: "Glutes",
  arms: "Arms",
  core: "Core",
  cardio: "Cardio",
  mobility: "Mobility",
};

export interface Profile {
  name: string;
  // Main
  goal: Goal;
  goals?: Goal[];
  experience: ExperienceLevel;
  currentWorkoutsPerWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  equipment: EquipmentSetup;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 20 | 30 | 45 | 60;
  focusAreas: FocusArea[];
  workoutSplit?: WorkoutSplitId;
  // Body
  currentWeightKg: number;
  goalWeightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  bodyFatPct?: number;
  // Activity (used for TDEE; separate from training days to avoid double counting)
  activityLevel: "sedentary" | "light" | "moderate" | "very" | "athlete";
  avgStepsPerDay?: number;
  // Goal timeline & calorie planning
  goalTargetDate: string; // ISO
  deficitSplit: "mostly_diet" | "balanced" | "mostly_exercise";
  bulkPace?: "lean" | "faster";
  // Nutrition
  nutritionPlan: NutritionPlan;
  // Misc
  units?: "metric" | "imperial";
  demoModelPreference?: DemoModelPreference;
  injuries?: string;
  equipmentItems?: string[];
  referralSource?: "tiktok" | "instagram" | "youtube" | "friend" | "appstore" | "google" | "other";
  referralCode?: string;
  completedAt: string;
}

const KEY = "fitness:profile";

interface Ctx {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  ready: boolean;
}

const ProfileContext = createContext<Ctx>({
  profile: null,
  setProfile: () => {},
  updateProfile: () => {},
  ready: false,
});

// Fired by ProfileProvider whenever the user changes their profile (cloud sync listens).
export const PROFILE_CHANGE_EVT = "fitness:profile-change";
// Fired by cloud sync after writing a pulled profile to localStorage (provider re-reads).
export const PROFILE_EXTERNAL_EVT = "fitness:profile-external";

export function readStoredProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeStoredProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(PROFILE_EXTERNAL_EVT));
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfileState(migrate(JSON.parse(raw)));
    } catch {
      // Ignore malformed legacy profile data and continue with onboarding defaults.
    }
    setReady(true);

    const onExternal = () => setProfileState(readStoredProfile());
    window.addEventListener(PROFILE_EXTERNAL_EVT, onExternal);
    return () => window.removeEventListener(PROFILE_EXTERNAL_EVT, onExternal);
  }, []);

  const setProfile = (p: Profile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVT));
  };
  const updateProfile = (patch: Partial<Profile>) => {
    setProfileState((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
    window.dispatchEvent(new Event(PROFILE_CHANGE_EVT));
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, updateProfile, ready }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);

// Backwards-compat: older profiles used different field names.
function migrate(raw: Record<string, unknown>): Profile {
  const goalMap: Record<string, Goal> = {
    muscle: "build_muscle",
    lose: "lose_weight",
    recomp: "recomp",
    energy: "maintain",
  };
  const equipMap = (loc: unknown): EquipmentSetup => (loc === "gym" ? "gym" : "none");
  const days = (raw.daysPerWeek as 2 | 3 | 4 | 5 | 6) ?? 4;
  const defaultActivity: Profile["activityLevel"] =
    days <= 2 ? "light" : days <= 4 ? "moderate" : "very";
  const defaultTarget = new Date();
  defaultTarget.setDate(defaultTarget.getDate() + 84); // 12 weeks
  const primaryGoal =
    (raw.goal as string) in goalMap
      ? goalMap[raw.goal as string]
      : ((raw.goal as Goal) ?? "build_muscle");
  const selectedGoals = Array.isArray(raw.goals)
    ? [
        ...new Set(
          (raw.goals as unknown[]).filter(
            (goal): goal is Goal => typeof goal === "string" && goal in GOAL_LABELS,
          ),
        ),
      ]
    : [];
  return {
    name: (raw.name as string) ?? "Athlete",
    goal: selectedGoals[0] ?? primaryGoal,
    goals: selectedGoals.length ? selectedGoals : [primaryGoal],
    experience: (raw.experience as ExperienceLevel) ?? "intermediate",
    currentWorkoutsPerWeek: (raw.currentWorkoutsPerWeek as Profile["currentWorkoutsPerWeek"]) ?? 3,
    equipment: (raw.equipment as EquipmentSetup) ?? equipMap(raw.location),
    daysPerWeek: days,
    sessionMinutes: (raw.sessionMinutes as 20 | 30 | 45 | 60) ?? 30,
    focusAreas: (raw.focusAreas as FocusArea[]) ?? ["chest", "back", "legs"],
    workoutSplit: (raw.workoutSplit as WorkoutSplitId) ?? "auto",
    currentWeightKg: (raw.currentWeightKg as number) ?? (raw.weightKg as number) ?? 70,
    goalWeightKg: (raw.goalWeightKg as number) ?? (raw.weightKg as number) ?? 70,
    heightCm: (raw.heightCm as number) ?? 170,
    age: (raw.age as number) ?? 25,
    gender: (raw.gender as Gender) ?? "other",
    bodyFatPct: raw.bodyFatPct as number | undefined,
    activityLevel: (raw.activityLevel as Profile["activityLevel"]) ?? defaultActivity,
    avgStepsPerDay: raw.avgStepsPerDay as number | undefined,
    goalTargetDate: (raw.goalTargetDate as string) ?? defaultTarget.toISOString(),
    deficitSplit: (raw.deficitSplit as Profile["deficitSplit"]) ?? "balanced",
    bulkPace: (raw.bulkPace as Profile["bulkPace"]) ?? "lean",
    nutritionPlan: (raw.nutritionPlan as NutritionPlan) ?? "maintenance",
    demoModelPreference: (raw.demoModelPreference as DemoModelPreference) ?? "auto",
    injuries: (raw.injuries as string) ?? "",
    equipmentItems:
      (raw.equipmentItems as string[]) ??
      defaultEquipmentItems((raw.equipment as EquipmentSetup) ?? equipMap(raw.location)),
    referralSource: raw.referralSource as Profile["referralSource"],
    referralCode: raw.referralCode as string | undefined,
    completedAt: (raw.completedAt as string) ?? new Date().toISOString(),
  };
}

function defaultEquipmentItems(setup: EquipmentSetup): string[] {
  switch (setup) {
    case "gym":
      return ["Full gym access"];
    case "dumbbells":
      return ["Dumbbells"];
    case "mixed":
      return ["Dumbbells", "Bench"];
    default:
      return ["No equipment"];
  }
}
