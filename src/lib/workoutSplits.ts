export type WorkoutSplitId =
  | "auto"
  | "full_body"
  | "upper_lower"
  | "push_pull_legs"
  | "ppl_upper_lower"
  | "phul"
  | "arnold"
  | "body_part";

export interface WorkoutSplitOption {
  id: WorkoutSplitId;
  name: string;
  shortName: string;
  description: string;
  bestFor: string;
  recommendedDays: Array<2 | 3 | 4 | 5 | 6>;
  badge?: string;
}

export const WORKOUT_SPLIT_OPTIONS: WorkoutSplitOption[] = [
  {
    id: "auto",
    name: "Ascendr Smart Split",
    shortName: "Smart Split",
    description: "Automatically balances strength, conditioning, recovery, and your focus areas.",
    bestFor: "Flexible schedules",
    recommendedDays: [2, 3, 4, 5, 6],
    badge: "Recommended",
  },
  {
    id: "full_body",
    name: "Full Body",
    shortName: "Full Body",
    description: "Train every major muscle group each session with alternating emphasis.",
    bestFor: "Beginners · 2–3 days",
    recommendedDays: [2, 3],
    badge: "Beginner friendly",
  },
  {
    id: "upper_lower",
    name: "Upper / Lower",
    shortName: "Upper / Lower",
    description: "Alternate upper- and lower-body sessions for a simple, balanced week.",
    bestFor: "Strength · 3–5 days",
    recommendedDays: [3, 4, 5],
    badge: "Balanced",
  },
  {
    id: "push_pull_legs",
    name: "Push / Pull / Legs",
    shortName: "PPL",
    description: "Group sessions by pressing, pulling, and lower-body movement patterns.",
    bestFor: "Muscle gain · 3–6 days",
    recommendedDays: [3, 4, 5, 6],
    badge: "Most popular",
  },
  {
    id: "ppl_upper_lower",
    name: "PPL + Upper / Lower",
    shortName: "PPLUL",
    description: "A five-session hybrid combining PPL variety with upper/lower frequency.",
    bestFor: "Hypertrophy · 5 days",
    recommendedDays: [5],
    badge: "High frequency",
  },
  {
    id: "phul",
    name: "PHUL",
    shortName: "PHUL",
    description: "Four rotating upper/lower sessions split between power and hypertrophy.",
    bestFor: "Strength + size · 4 days",
    recommendedDays: [4],
    badge: "Power + size",
  },
  {
    id: "arnold",
    name: "Arnold Split",
    shortName: "Arnold",
    description: "Pair chest with back, shoulders with arms, then train legs.",
    bestFor: "Experienced · 3 or 6 days",
    recommendedDays: [3, 6],
    badge: "Classic",
  },
  {
    id: "body_part",
    name: "Body-Part Split",
    shortName: "Body-Part",
    description: "Give a major muscle group its own focused training day.",
    bestFor: "High volume · 5–6 days",
    recommendedDays: [5, 6],
    badge: "Bodybuilding",
  },
];

export const WORKOUT_SPLIT_LABELS = Object.fromEntries(
  WORKOUT_SPLIT_OPTIONS.map((option) => [option.id, option.name]),
) as Record<WorkoutSplitId, string>;

export function getWorkoutSplitOption(id: WorkoutSplitId | undefined): WorkoutSplitOption {
  return (
    WORKOUT_SPLIT_OPTIONS.find((option) => option.id === (id ?? "auto")) ?? WORKOUT_SPLIT_OPTIONS[0]
  );
}
