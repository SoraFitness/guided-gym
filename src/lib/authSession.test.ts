import { describe, expect, it } from "vitest";
import {
  isAccountSession,
  isGuestSession,
  parseNativeAuthCallback,
  type AuthSession,
} from "./authSession";

const anonymousSession: AuthSession = {
  userId: "guest-user",
  accessToken: "guest-token",
  email: null,
  isAnonymous: true,
};

const accountSession: AuthSession = {
  userId: "account-user",
  accessToken: "account-token",
  email: "member@example.com",
  isAnonymous: false,
};

describe("auth session classification", () => {
  it("keeps anonymous identities in guest mode", () => {
    expect(isGuestSession(null)).toBe(true);
    expect(isGuestSession(anonymousSession)).toBe(true);
    expect(isGuestSession(accountSession)).toBe(false);
    expect(isGuestSession("loading")).toBe(false);
  });

  it("only treats a permanent identity as an account", () => {
    expect(isAccountSession(null)).toBe(false);
    expect(isAccountSession(anonymousSession)).toBe(false);
    expect(isAccountSession(accountSession)).toBe(true);
    expect(isAccountSession("loading")).toBe(false);
  });

  it("accepts only Ascendr native auth callbacks", () => {
    expect(parseNativeAuthCallback("ascendr://auth/callback?code=example-code")).toEqual({
      type: "code",
      code: "example-code",
    });
    expect(
      parseNativeAuthCallback(
        "ascendr://auth/callback#access_token=access-token&refresh_token=refresh-token",
      ),
    ).toEqual({ type: "tokens", accessToken: "access-token", refreshToken: "refresh-token" });
    expect(parseNativeAuthCallback("https://example.com/auth/callback?code=example-code")).toBe(
      null,
    );
  });
});
