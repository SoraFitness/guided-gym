import { describe, expect, it } from "vitest";
import { formatMemberContext } from "./scanMemberContext";

describe("scan member context", () => {
  it("summarizes the self-reported answers a scan plan needs", () => {
    expect(
      formatMemberContext({
        gender: "male",
        goal: "build_muscle",
        experience: "intermediate",
        height_cm: 180,
        current_weight_kg: 82.35,
        goal_weight_kg: 86,
        profile: {
          goals: ["build_muscle", "get_stronger"],
          daysPerWeek: 4,
          sessionMinutes: 60,
          equipment: "gym",
        },
      }),
    ).toBe(
      [
        "MEMBER CONTEXT (self-reported in the app). Use it only to tailor the action plan and calibrate estimates; never infer anything else about the person.",
        "- Sex: male",
        "- Goals: Build muscle, Get stronger",
        "- Training: intermediate experience, 4 training days per week, 60-minute sessions, Full gym",
        "- Body: height 180 cm, weight 82.4 kg, goal weight 86 kg",
      ].join("\n"),
    );
  });

  it("leaves out unspecified sex and returns nothing when no answers exist", () => {
    expect(
      formatMemberContext({
        gender: "other",
        goal: null,
        experience: null,
        height_cm: null,
        current_weight_kg: null,
        goal_weight_kg: null,
        profile: null,
      }),
    ).toBeNull();
  });
});
