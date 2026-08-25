const ACCOUNT_OWNER_KEY = "ascendr:local-data-owner:v1";

const ACCOUNT_SCOPED_STORAGE_KEYS = [
  "fitness:profile",
  "fitness:foodlog",
  "fitness:goals",
  "fitness:bodyScans",
  "fitness:completedWorkouts:v2",
  "fitness:activeSession:v2",
  "fitness:weightUnit",
  "fitness:weightlog",
  "fitness:workoutLog",
  "fitness:foodrecent",
  "fitness:foodfavs",
  "fitness:savedWorkoutPlans:v1",
  "fitness:weeklyCompletion",
  "fitness:guest-progress-photos",
  "fitness:tourCompleted",
  "ascendr:onboarding-progress:v2",
  "ascendr:onboarding-paywall:v1",
  "ascendr_onboarding_name",
] as const;

export function localDataBelongsToAccount(userId: string): boolean {
  if (typeof window === "undefined") return true;
  const currentOwner = localStorage.getItem(ACCOUNT_OWNER_KEY);
  return !currentOwner || currentOwner === userId;
}

export function claimLocalDataOwnership(userId: string): boolean {
  if (typeof window === "undefined") return false;

  const currentOwner = localStorage.getItem(ACCOUNT_OWNER_KEY);
  if (!currentOwner || currentOwner === userId) {
    localStorage.setItem(ACCOUNT_OWNER_KEY, userId);
    return false;
  }

  for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) localStorage.removeItem(key);
  localStorage.setItem(ACCOUNT_OWNER_KEY, userId);
  return true;
}
