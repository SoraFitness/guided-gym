import { describe, expect, it } from "vitest";
import { getWorkout } from "./workouts";
import { splitLabelForWorkout } from "./weeklySchedule";
import type { WorkoutPlanInput } from "./workoutPlanStore";
import { buildProgramCandidates, fallbackProgram, orderProgramSessions } from "./workoutProgram";

const lifter: WorkoutPlanInput = {
  goal: "build_muscle",
  goals: ["build_muscle"],
  experience: "intermediate",
  equipment: "gym",
  focusAreas: ["chest", "back", "legs"],
  daysPerWeek: 4,
  sessionMinutes: 45,
  workoutSplit: "auto",
  notes: "",
};

function sessionType(id: string) {
  const workout = getWorkout(id);
  if (!workout) throw new Error(`Unknown workout ${id}`);
  return splitLabelForWorkout(workout);
}

describe("smart split programs", () => {
  it("builds the week around a proven split for the member's goal", () => {
    const types = (patch: Partial<WorkoutPlanInput>) =>
      fallbackProgram({ ...lifter, ...patch }).workoutIds.map(sessionType);

    expect(types({})).toEqual(["Upper Body", "Lower Body", "Upper Body", "Leg Day"]);
    expect(types({ daysPerWeek: 3 })).toEqual(["Push Day", "Pull Day", "Leg Day"]);
    expect(types({ daysPerWeek: 3, experience: "beginner" })).toEqual([
      "Full Body Strength",
      "Full Body Strength",
      "Full Body Strength",
    ]);
    expect(types({ goal: "lose_weight", goals: ["lose_weight"], daysPerWeek: 3 })).toContain(
      "Full Body Conditioning",
    );
  });

  it("schedules one training session per day and never a recovery session", () => {
    for (const equipment of ["none", "dumbbells", "gym"] as const) {
      for (const daysPerWeek of [2, 3, 4, 5, 6] as const) {
        const program = fallbackProgram({ ...lifter, equipment, daysPerWeek });
        expect(program.workoutIds).toHaveLength(daysPerWeek);
        expect(program.workoutIds.every((id) => getWorkout(id)?.category !== "Mobility")).toBe(
          true,
        );
      }
    }
  });

  it("varies the week instead of training the same session type back to back", () => {
    const types = fallbackProgram({ ...lifter, daysPerWeek: 5 }).workoutIds.map(sessionType);
    expect(new Set(types).size).toBeGreaterThan(2);
    types.slice(1).forEach((type, index) => expect(type).not.toBe(types[index]));
  });

  it("only offers workouts that fit the member's equipment", () => {
    const candidates = buildProgramCandidates({ ...lifter, equipment: "none" });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every(({ workout }) => workout.equipment.includes("none"))).toBe(true);
  });

  it("reorders sessions so the same type is not trained on consecutive days", () => {
    expect(
      orderProgramSessions([
        "push-strength",
        "push-strength",
        "pull-strength",
        "lower-body-burn",
      ]).map(sessionType),
    ).toEqual(["Push Day", "Pull Day", "Push Day", "Leg Day"]);
  });

  it("builds a different program for a different member", () => {
    const runner = fallbackProgram({
      ...lifter,
      goal: "endurance",
      goals: ["endurance"],
      equipment: "none",
      focusAreas: ["cardio", "legs"],
      daysPerWeek: 3,
      sessionMinutes: 30,
    }).workoutIds;
    expect(runner).not.toEqual(fallbackProgram(lifter).workoutIds.slice(0, 3));
    expect(runner.some((id) => ["Cardio", "HIIT"].includes(getWorkout(id)?.category ?? ""))).toBe(
      true,
    );
  });
});
