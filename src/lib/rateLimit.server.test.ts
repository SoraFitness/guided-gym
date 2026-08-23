import { beforeEach, describe, expect, it } from "vitest";
import {
  assertRequestSize,
  claimRateLimit,
  rateLimitResponse,
  resetRateLimitsForTests,
} from "./rateLimit.server";

describe("AI request protection", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("rejects calls above the configured allowance", () => {
    claimRateLimit("test", { identity: "user-1", limit: 2, windowMs: 60_000 });
    claimRateLimit("test", { identity: "user-1", limit: 2, windowMs: 60_000 });

    expect(() =>
      claimRateLimit("test", { identity: "user-1", limit: 2, windowMs: 60_000 }),
    ).toThrow(/RATE_LIMITED/);
  });

  it("returns HTTP 429 with Retry-After for a rate-limit error", () => {
    const response = rateLimitResponse(new Error("RATE_LIMITED:42"));
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("42");
  });

  it("rejects oversized request bodies before parsing JSON", () => {
    const request = new Request("https://ascendr.test/api/coach", {
      method: "POST",
      headers: { "content-length": "300000" },
    });
    expect(() => assertRequestSize(request, 256_000)).toThrow("REQUEST_TOO_LARGE");
  });
});
