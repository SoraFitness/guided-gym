// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { maybeSingle } = vi.hoisted(() => ({ maybeSingle: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

import { restoreCloudProfile } from "./cloudProfileRestore";
import { readStoredProfile } from "./profile";

const savedProfile = {
  name: "Returning member",
  goal: "build_muscle",
  experience: "intermediate",
  completedAt: "2026-08-01T12:00:00.000Z",
};

describe("cloud profile restore", () => {
  beforeEach(() => {
    localStorage.clear();
    maybeSingle.mockReset();
  });

  it("copies a signed-in member's saved profile onto a device without one", async () => {
    maybeSingle.mockResolvedValue({ data: { profile: savedProfile }, error: null });

    await expect(restoreCloudProfile("member-with-profile")).resolves.toBe(true);
    expect(readStoredProfile()).toMatchObject({
      name: "Returning member",
      completedAt: "2026-08-01T12:00:00.000Z",
    });
    expect(localStorage.getItem("ascendr:local-data-owner:v1")).toBe("member-with-profile");
  });

  it("reports when a member has no saved profile so onboarding can continue", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(restoreCloudProfile("member-without-profile")).resolves.toBe(false);
    expect(readStoredProfile()).toBeNull();
  });
});
