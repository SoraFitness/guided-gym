import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Goal = "lose_weight" | "build_muscle" | "recomp" | "endurance" | "maintain" | "get_stronger" | "overall";
export type Gender = "male" | "female" | "other";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type EquipmentSetup = "none" | "dumbbells" | "gym" | "mixed";
export type FocusArea = "chest" | "back" | "legs" | "glutes" | "arms" | "core" | "cardio" | "mobility";
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
  chest: "Chest", back: "Back", legs: "Legs", glutes: "Glutes",
  arms: "Arms", core: "Core", cardio: "Cardio", mobility: "Mobility",
};

export interface Profile {
  name: string;
  // Main
  goal: Goal;
  experience: ExperienceLevel;
  equipment: EquipmentSetup;
  daysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 20 | 30 | 45 | 60;
  focusAreas: FocusArea[];
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
  injuries?: string;
  equipmentItems?: string[];
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
  profile: null, setProfile: () => {}, updateProfile: () => {}, ready: false,
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfileState(migrate(JSON.parse(raw)));
    } catch {}
    setReady(true);
  }, []);

  const setProfile = (p: Profile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem(KEY, JSON.stringify(p));
    else localStorage.removeItem(KEY);
  };
  const updateProfile = (patch: Partial<Profile>) => {
    setProfileState((cur) => {
      if (!cur) return cur;
      const next = { ...cur, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
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
  return {
    name: (raw.name as string) ?? "Athlete",
    goal: (raw.goal as string) in goalMap ? goalMap[raw.goal as string] : ((raw.goal as Goal) ?? "build_muscle"),
    experience: (raw.experience as ExperienceLevel) ?? "intermediate",
    equipment: (raw.equipment as EquipmentSetup) ?? equipMap(raw.location),
    daysPerWeek: days,
    sessionMinutes: (raw.sessionMinutes as 20 | 30 | 45 | 60) ?? 30,
    focusAreas: (raw.focusAreas as FocusArea[]) ?? ["chest", "back", "legs"],
    currentWeightKg: (raw.currentWeightKg as number) ?? (raw.weightKg as number) ?? 70,
    goalWeightKg: (raw.goalWeightKg as number) ?? (raw.weightKg as number) ?? 70,
    heightCm: (raw.heightCm as number) ?? 170,
    age: (raw.age as number) ?? 25,
    gender: (raw.gender as Gender) ?? "other",
    bodyFatPct: (raw.bodyFatPct as number | undefined),
    activityLevel: (raw.activityLevel as Profile["activityLevel"]) ?? defaultActivity,
    avgStepsPerDay: (raw.avgStepsPerDay as number | undefined),
    goalTargetDate: (raw.goalTargetDate as string) ?? defaultTarget.toISOString(),
    deficitSplit: (raw.deficitSplit as Profile["deficitSplit"]) ?? "balanced",
    bulkPace: (raw.bulkPace as Profile["bulkPace"]) ?? "lean",
    nutritionPlan: (raw.nutritionPlan as NutritionPlan) ?? "maintenance",
    injuries: (raw.injuries as string) ?? "",
    equipmentItems: (raw.equipmentItems as string[]) ?? defaultEquipmentItems((raw.equipment as EquipmentSetup) ?? equipMap(raw.location)),
    completedAt: (raw.completedAt as string) ?? new Date().toISOString(),
  };
}

function defaultEquipmentItems(setup: EquipmentSetup): string[] {
  switch (setup) {
    case "gym": return ["Full gym access"];
    case "dumbbells": return ["Dumbbells"];
    case "mixed": return ["Dumbbells", "Bench"];
    default: return ["No equipment"];
  }
}
