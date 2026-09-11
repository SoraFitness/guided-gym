// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import {
  claimLocalDataOwnership,
  localDataBelongsToAccount,
  markGuestOnboardingCompleted,
  markGuestOnboardingPlan,
} from "./accountOwnership";

const OWNER_KEY = "ascendr:local-data-owner:v1";
const COMPLETED_AT = "2026-09-10T12:00:00.000Z";

function readJson(key: string) {
  return JSON.parse(localStorage.getItem(key) ?? "null") as unknown;
}

function completeOnboardingWhileSignedOut(planId: string) {
  localStorage.setItem(
    "fitness:profile",
    JSON.stringify({ name: "New member", completedAt: COMPLETED_AT }),
  );
  localStorage.setItem("fitness:goals", JSON.stringify({ kcal: 2200, protein: 160 }));
  markGuestOnboardingCompleted(COMPLETED_AT);
  localStorage.setItem(
    "fitness:savedWorkoutPlans:v1",
    JSON.stringify([{ id: planId }, { id: "previous-account-plan" }]),
  );
  markGuestOnboardingPlan(planId);
}

describe("local data ownership", () => {
  beforeEach(() => localStorage.clear());

  it("lets the first account on a device keep its local data", () => {
    localStorage.setItem("fitness:profile", JSON.stringify({ name: "Member" }));

    expect(claimLocalDataOwnership("account-a")).toBe(false);
    expect(localStorage.getItem(OWNER_KEY)).toBe("account-a");
    expect(localStorage.getItem("fitness:profile")).not.toBeNull();
    expect(localDataBelongsToAccount("account-a")).toBe(true);
    expect(localDataBelongsToAccount("account-b")).toBe(false);
  });

  it("clears the previous account's data when a different account signs in", () => {
    localStorage.setItem(OWNER_KEY, "account-a");
    localStorage.setItem("fitness:profile", JSON.stringify({ name: "Account A" }));
    localStorage.setItem("fitness:foodlog", "[]");

    expect(claimLocalDataOwnership("account-b")).toBe(true);
    expect(localStorage.getItem("fitness:profile")).toBeNull();
    expect(localStorage.getItem("fitness:foodlog")).toBeNull();
    expect(localStorage.getItem(OWNER_KEY)).toBe("account-b");
  });

  it("keeps onboarding finished while signed out for the account that signs in next", () => {
    localStorage.setItem(OWNER_KEY, "account-a");
    localStorage.setItem("fitness:foodlog", JSON.stringify([{ id: "account-a-meal" }]));
    completeOnboardingWhileSignedOut("onboarding-plan");

    expect(claimLocalDataOwnership("account-b")).toBe(true);
    expect(readJson("fitness:profile")).toMatchObject({ name: "New member" });
    expect(readJson("fitness:goals")).toEqual({ kcal: 2200, protein: 160 });
    expect(readJson("fitness:savedWorkoutPlans:v1")).toEqual([{ id: "onboarding-plan" }]);
    expect(localStorage.getItem("fitness:foodlog")).toBeNull();
    expect(localStorage.getItem(OWNER_KEY)).toBe("account-b");
  });

  it("does not keep a profile that changed after the signed-out onboarding", () => {
    localStorage.setItem(OWNER_KEY, "account-a");
    completeOnboardingWhileSignedOut("onboarding-plan");
    localStorage.setItem(
      "fitness:profile",
      JSON.stringify({ name: "Account A", completedAt: "2026-01-01T00:00:00.000Z" }),
    );

    expect(claimLocalDataOwnership("account-b")).toBe(true);
    expect(localStorage.getItem("fitness:profile")).toBeNull();
    expect(localStorage.getItem("fitness:savedWorkoutPlans:v1")).toBeNull();
  });
});
