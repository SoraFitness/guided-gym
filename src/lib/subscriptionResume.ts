const SUBSCRIPTION_RESUME_PATH_KEY = "ascendr:subscription-resume-path:v1";

function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

export function saveSubscriptionResumePath(path: string) {
  if (typeof window === "undefined" || !isSafeInternalPath(path)) return;
  localStorage.setItem(SUBSCRIPTION_RESUME_PATH_KEY, path);
}

export function consumeSubscriptionResumePath(): string | null {
  if (typeof window === "undefined") return null;
  const path = localStorage.getItem(SUBSCRIPTION_RESUME_PATH_KEY);
  localStorage.removeItem(SUBSCRIPTION_RESUME_PATH_KEY);
  return path && isSafeInternalPath(path) ? path : null;
}
