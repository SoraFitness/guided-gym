import { createClientId } from "./clientId";

export const ONBOARDING_FLOW_VERSION = "2026-08-conversion-v2";
const VISITOR_KEY = "ascendr:onboarding:visitor-id";

export type OnboardingAttribution = {
  landingPath: string;
  referrerHost: string | null;
  referralSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  locale: string | null;
};

export type OnboardingResponseSnapshot = {
  goal: string;
  goals: string[];
  experience: string;
  equipment: string;
  daysPerWeek: number;
  sessionMinutes: number;
  currentWorkoutsPerWeek: number;
  focusAreas: string[];
  gender: string;
  activityLevel: string;
  nutritionPlan: string;
  units: string;
  motivation: string | null;
  hasTrainingLimitations: boolean;
};

export type OnboardingAnalyticsDraft = OnboardingResponseSnapshot & {
  referralSource?: string;
};

function limit(value: string | null | undefined, max = 120) {
  const text = value?.trim();
  return text ? text.slice(0, max) : null;
}

export function getOnboardingVisitorId() {
  if (typeof window === "undefined") return createClientId();
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const next = createClientId();
    localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return createClientId();
  }
}

export function captureBrowserAttribution(referralSource?: string): OnboardingAttribution {
  if (typeof window === "undefined") {
    return {
      landingPath: "/onboarding",
      referrerHost: null,
      referralSource: limit(referralSource, 48),
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      locale: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  let referrerHost: string | null = null;
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    referrerHost = null;
  }

  return {
    landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    referrerHost: limit(referrerHost),
    referralSource: limit(referralSource, 48),
    utmSource: limit(params.get("utm_source"), 80),
    utmMedium: limit(params.get("utm_medium"), 80),
    utmCampaign: limit(params.get("utm_campaign"), 120),
    locale: limit(navigator.language, 24),
  };
}

/**
 * This snapshot intentionally excludes name, free-text limitation notes, exact
 * body measurements, and any contact details. It is for product analytics,
 * not a second copy of a user's health profile.
 */
export function buildOnboardingResponseSnapshot(
  draft: OnboardingAnalyticsDraft,
): OnboardingResponseSnapshot {
  return {
    goal: draft.goal,
    goals: [...new Set(draft.goals)].slice(0, 4),
    experience: draft.experience,
    equipment: draft.equipment,
    daysPerWeek: draft.daysPerWeek,
    sessionMinutes: draft.sessionMinutes,
    currentWorkoutsPerWeek: draft.currentWorkoutsPerWeek,
    focusAreas: [...new Set(draft.focusAreas)].slice(0, 8),
    gender: draft.gender,
    activityLevel: draft.activityLevel,
    nutritionPlan: draft.nutritionPlan,
    units: draft.units,
    motivation: limit(draft.motivation, 48),
    hasTrainingLimitations: draft.hasTrainingLimitations,
  };
}
