// An Ascendr account is active on one device at a time. When a newer sign-in replaces
// this device, every backend layer rejects it with this code.

export const SESSION_REPLACED_CODE = "SESSION_REPLACED";
export const SESSION_REPLACED_MESSAGE = `${SESSION_REPLACED_CODE}: This Ascendr account is now signed in on another device.`;

const NOTICE_KEY = "ascendr:session-replaced:v1";

export function isSessionReplacedError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.includes(SESSION_REPLACED_CODE);
}

/** Remembers to explain the sign-out on the next sign-in screen. */
export function markSessionReplaced() {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTICE_KEY, new Date().toISOString());
}

/** The notice stays until the member signs in again, so it survives reloads. */
export function hasSessionReplacedNotice(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NOTICE_KEY) !== null;
}

export function clearSessionReplacedNotice() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(NOTICE_KEY);
}
