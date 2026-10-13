// Server-side admin allowlist for internal-only tools (marketing scans).
//
// Fails closed exactly like the onboarding-insights gate: with no allowlist
// configured nobody is an admin, so a missing env var can never open the door.
// Set ASCENDR_ADMIN_EMAILS to a comma-separated list in the server environment.

export class AdminAccessError extends Error {
  constructor() {
    super("This tool is limited to Ascendr staff accounts.");
  }
}

function adminAllowlist() {
  const raw = process.env.ASCENDR_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Throws unless the signed-in member's email is on the allowlist. */
export function requireAdminEmail(email: unknown) {
  const allowlist = adminAllowlist();
  if (!allowlist.size) throw new AdminAccessError();
  if (typeof email !== "string" || !allowlist.has(email.trim().toLowerCase())) {
    throw new AdminAccessError();
  }
}
