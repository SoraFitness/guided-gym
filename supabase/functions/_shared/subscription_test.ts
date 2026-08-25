import {
  getSubscriptionAccess,
  requireActiveSubscription,
  SubscriptionRequiredError,
  SubscriptionVerificationError,
} from "./subscription.ts";

const originalFetch = globalThis.fetch;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) Deno.env.delete(name);
  else Deno.env.set(name, value);
}

function mockRevenueCat(status: number, payload: unknown) {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
}

function withRevenueCatEnvironment(callback: () => Promise<void>) {
  return async () => {
    const originalApiKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    const originalEntitlementId = Deno.env.get("REVENUECAT_ENTITLEMENT_ID");
    Deno.env.set("REVENUECAT_SECRET_API_KEY", "test-key");
    Deno.env.delete("REVENUECAT_ENTITLEMENT_ID");
    try {
      await callback();
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnvironment("REVENUECAT_SECRET_API_KEY", originalApiKey);
      restoreEnvironment("REVENUECAT_ENTITLEMENT_ID", originalEntitlementId);
    }
  };
}

Deno.test(
  "expired pro entitlement denies access and preserves the expiry date",
  withRevenueCatEnvironment(async () => {
    mockRevenueCat(200, {
      subscriber: {
        entitlements: { pro: { expires_date: "2000-01-01T00:00:00.000Z" } },
      },
    });

    const access = await getSubscriptionAccess("test-user");
    assert(access.active === false, "Expired subscriptions must be inactive.");
    assert(
      access.expiresAt === "2000-01-01T00:00:00.000Z",
      "The expiry date should be returned for renewal messaging.",
    );

    let receivedError: unknown;
    try {
      await requireActiveSubscription("test-user");
    } catch (error) {
      receivedError = error;
    }
    assert(
      receivedError instanceof SubscriptionRequiredError,
      "Expired subscriptions must be rejected by protected operations.",
    );
  }),
);

Deno.test(
  "a current RevenueCat grace period keeps access active",
  withRevenueCatEnvironment(async () => {
    mockRevenueCat(200, {
      subscriber: {
        entitlements: {
          pro: {
            expires_date: "2000-01-01T00:00:00.000Z",
            grace_period_expires_date: "2030-01-01T00:00:00.000Z",
          },
        },
      },
    });

    const access = await getSubscriptionAccess("test-user");
    assert(access.active === true, "An active grace period should preserve access.");
    assert(
      access.expiresAt === "2030-01-01T00:00:00.000Z",
      "The latest valid RevenueCat date should be used.",
    );
  }),
);

Deno.test(
  "a missing pro entitlement denies access",
  withRevenueCatEnvironment(async () => {
    mockRevenueCat(200, { subscriber: { entitlements: {} } });

    const access = await getSubscriptionAccess("test-user");
    assert(access.active === false, "Users without pro must be denied access.");
    assert(access.expiresAt === null, "Missing entitlements have no expiry date.");
  }),
);

Deno.test(
  "RevenueCat failures fail closed",
  withRevenueCatEnvironment(async () => {
    mockRevenueCat(503, { message: "Unavailable" });

    let receivedError: unknown;
    try {
      await getSubscriptionAccess("test-user");
    } catch (error) {
      receivedError = error;
    }
    assert(
      receivedError instanceof SubscriptionVerificationError,
      "Verification failures must not grant paid access.",
    );
  }),
);
