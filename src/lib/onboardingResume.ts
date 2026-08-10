export type OnboardingPaywallSource = "body-scan" | "face-scan" | null;

export interface OnboardingPaywallCheckpoint {
  name: string;
  source: OnboardingPaywallSource;
  reachedAt: string;
  lastVisitedAt: string | null;
}

export const ONBOARDING_PROGRESS_STORAGE_KEY = "ascendr:onboarding-progress:v2";
const PAYWALL_CHECKPOINT_STORAGE_KEY = "ascendr:onboarding-paywall:v1";
const LEGACY_NAME_STORAGE_KEY = "ascendr_onboarding_name";

export function saveOnboardingPaywallCheckpoint(name: string, source: OnboardingPaywallSource) {
  if (typeof window === "undefined") return;
  const existing = getOnboardingPaywallCheckpoint();
  const checkpoint: OnboardingPaywallCheckpoint = {
    name: name.trim() || existing?.name || "Athlete",
    source,
    reachedAt: existing?.reachedAt ?? new Date().toISOString(),
    lastVisitedAt: existing?.lastVisitedAt ?? null,
  };
  localStorage.setItem(PAYWALL_CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
}

export function getOnboardingPaywallCheckpoint(): OnboardingPaywallCheckpoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PAYWALL_CHECKPOINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingPaywallCheckpoint>;
    const source =
      parsed.source === "body-scan" || parsed.source === "face-scan" ? parsed.source : null;
    if (typeof parsed.name !== "string" || typeof parsed.reachedAt !== "string") return null;
    return {
      name: parsed.name,
      source,
      reachedAt: parsed.reachedAt,
      lastVisitedAt: typeof parsed.lastVisitedAt === "string" ? parsed.lastVisitedAt : null,
    };
  } catch {
    return null;
  }
}

export function markOnboardingPaywallVisited() {
  const checkpoint = getOnboardingPaywallCheckpoint();
  if (!checkpoint) return;
  localStorage.setItem(
    PAYWALL_CHECKPOINT_STORAGE_KEY,
    JSON.stringify({ ...checkpoint, lastVisitedAt: new Date().toISOString() }),
  );
}

export function clearOnboardingResume() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PAYWALL_CHECKPOINT_STORAGE_KEY);
  localStorage.removeItem(ONBOARDING_PROGRESS_STORAGE_KEY);
  localStorage.removeItem(LEGACY_NAME_STORAGE_KEY);
}
