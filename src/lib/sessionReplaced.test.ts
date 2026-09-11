import { describe, expect, it } from "vitest";
import { SESSION_REPLACED_MESSAGE, isSessionReplacedError } from "./sessionReplaced";

describe("replaced session errors", () => {
  it("recognises the error from the server, Edge Functions, and the database", () => {
    expect(isSessionReplacedError(new Error(SESSION_REPLACED_MESSAGE))).toBe(true);
    // Edge Functions and the scan quota functions return the bare code.
    expect(isSessionReplacedError(new Error("SESSION_REPLACED"))).toBe(true);
    expect(isSessionReplacedError("SESSION_REPLACED")).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isSessionReplacedError(new Error("Unauthorized: Invalid token"))).toBe(false);
    expect(isSessionReplacedError(null)).toBe(false);
    expect(isSessionReplacedError({ message: "SESSION_REPLACED" })).toBe(false);
  });
});
