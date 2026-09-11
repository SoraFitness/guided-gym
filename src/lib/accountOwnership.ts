const ACCOUNT_OWNER_KEY = "ascendr:local-data-owner:v1";
// Written when onboarding finishes while signed out, so the account that signs
// in next keeps that onboarding instead of wiping it as the previous account's.
const GUEST_ONBOARDING_KEY = "ascendr:guest-onboarding:v1";

const PROFILE_KEY = "fitness:profile";
const GOALS_KEY = "fitness:goals";
const WORKOUT_PLANS_KEY = "fitness:savedWorkoutPlans:v1";

const ACCOUNT_SCOPED_STORAGE_KEYS = [
  PROFILE_KEY,
  "fitness:foodlog",
  GOALS_KEY,
  "fitness:bodyScans",
  "fitness:completedWorkouts:v2",
  "fitness:activeSession:v2",
  "fitness:weightUnit",
  "fitness:weightlog",
  "fitness:workoutLog",
  "fitness:foodrecent",
  "fitness:foodfavs",
  WORKOUT_PLANS_KEY,
  "fitness:weeklyCompletion",
  "fitness:guest-progress-photos",
  "fitness:tourCompleted",
  "ascendr:onboarding-progress:v2",
  "ascendr:onboarding-paywall:v1",
  "ascendr_onboarding_name",
] as const;

interface GuestOnboarding {
  previousOwner: string | null;
  completedAt: string;
  planId: string | null;
}

function readGuestOnboarding(): GuestOnboarding | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(GUEST_ONBOARDING_KEY) ?? "null",
    ) as Partial<GuestOnboarding> | null;
    if (!parsed || typeof parsed.completedAt !== "string") return null;
    return {
      previousOwner: typeof parsed.previousOwner === "string" ? parsed.previousOwner : null,
      completedAt: parsed.completedAt,
      planId: typeof parsed.planId === "string" ? parsed.planId : null,
    };
  } catch {
    return null;
  }
}

export function markGuestOnboardingCompleted(completedAt: string) {
  if (typeof window === "undefined") return;
  const guestOnboarding: GuestOnboarding = {
    previousOwner: localStorage.getItem(ACCOUNT_OWNER_KEY),
    completedAt,
    planId: null,
  };
  localStorage.setItem(GUEST_ONBOARDING_KEY, JSON.stringify(guestOnboarding));
}

export function markGuestOnboardingPlan(planId: string) {
  if (typeof window === "undefined") return;
  const guestOnboarding = readGuestOnboarding();
  if (!guestOnboarding) return;
  localStorage.setItem(GUEST_ONBOARDING_KEY, JSON.stringify({ ...guestOnboarding, planId }));
}

// The profile, targets, and plan created by a signed-out onboarding that
// happened after `currentOwner` last used this device.
function guestOnboardingEntries(currentOwner: string): Array<[string, string]> {
  const guestOnboarding = readGuestOnboarding();
  if (!guestOnboarding || guestOnboarding.previousOwner !== currentOwner) return [];

  const profile = localStorage.getItem(PROFILE_KEY);
  try {
    const completedAt = profile
      ? (JSON.parse(profile) as { completedAt?: unknown }).completedAt
      : null;
    if (!profile || completedAt !== guestOnboarding.completedAt) return [];
  } catch {
    return [];
  }

  const entries: Array<[string, string]> = [[PROFILE_KEY, profile]];
  const goals = localStorage.getItem(GOALS_KEY);
  if (goals) entries.push([GOALS_KEY, goals]);
  if (guestOnboarding.planId) {
    try {
      const plans = JSON.parse(localStorage.getItem(WORKOUT_PLANS_KEY) ?? "[]") as unknown;
      const plan = Array.isArray(plans)
        ? plans.find((item: { id?: unknown } | null) => item?.id === guestOnboarding.planId)
        : undefined;
      if (plan) entries.push([WORKOUT_PLANS_KEY, JSON.stringify([plan])]);
    } catch {
      // The plan can be rebuilt from the profile; keep the rest of onboarding.
    }
  }
  return entries;
}

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
    localStorage.removeItem(GUEST_ONBOARDING_KEY);
    return false;
  }

  const keptOnboarding = guestOnboardingEntries(currentOwner);
  for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) localStorage.removeItem(key);
  localStorage.removeItem(GUEST_ONBOARDING_KEY);
  for (const [key, value] of keptOnboarding) localStorage.setItem(key, value);
  localStorage.setItem(ACCOUNT_OWNER_KEY, userId);
  return true;
}
