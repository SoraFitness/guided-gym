import { describe, expect, it } from "vitest";
import { getWorkout } from "./workouts";
import { weeklyScheduleService } from "./weeklySchedule";
import type { Profile } from "./profile";

const profile: Profile = {
  name: "Test athlete",
  goal: "build_muscle",
  experience: "intermediate",
  equipment: "mixed",
  daysPerWeek: 3,
  sessionMinutes: 45,
  focusAreas: ["chest", "back", "legs"],
  workoutSplit: "push_pull_legs",
  currentWeightKg: 75,
  goalWeightKg: 75,
  heightCm: 175,
  age: 28,
  gender: "other",
  activityLevel: "moderate",
  goalTargetDate: "2026-12-01T00:00:00.000Z",
  deficitSplit: "balanced",
  nutritionPlan: "muscle_gain",
  completedAt: "2026-08-23T00:00:00.000Z",
};

describe("weekly schedule workout matching", () => {
  it("never applies a positional Push workout to a scheduled Leg day", () => {
    const schedule = weeklyScheduleService.generateSchedule(profile, [
      "push-strength",
      "push-strength",
      "push-strength",
    ]);
    const legDay = schedule.find((day) => day.splitLabel === "Leg Day");
    const workout = legDay?.workoutId ? getWorkout(legDay.workoutId) : undefined;

    expect(legDay?.workoutId).not.toBe("push-strength");
    expect(workout?.targetMuscles.some((muscle) => muscle === "legs" || muscle === "glutes")).toBe(
      true,
    );
    expect(
      legDay?.exercises.some((exercise) => /squat|lunge|deadlift|leg|calf|glute/i.test(exercise)),
    ).toBe(true);
  });

  it("uses a compatible saved workout for each PPL training day", () => {
    const schedule = weeklyScheduleService.generateSchedule(profile, [
      "push-strength",
      "pull-strength",
      "lower-body-burn",
    ]);

    expect(schedule.find((day) => day.splitLabel === "Push Day")?.workoutId).toBe("push-strength");
    expect(schedule.find((day) => day.splitLabel === "Pull Day")?.workoutId).toBe("pull-strength");
    expect(schedule.find((day) => day.splitLabel === "Leg Day")?.workoutId).toBe("lower-body-burn");
  });

  it("plans every week in a selected month with split-compatible workouts", () => {
    const augustSchedule = weeklyScheduleService.generateMonthSchedule(
      profile,
      new Date(2026, 7, 1),
      ["push-strength", "pull-strength", "lower-body-burn"],
    );
    const augustDays = augustSchedule.filter((day) => day.dateISO.startsWith("2026-08"));
    const plannedDays = augustDays.filter((day) => !day.isRestDay);
    const legDays = plannedDays.filter((day) => day.splitLabel === "Leg Day");

    expect(augustDays).toHaveLength(31);
    expect(plannedDays).toHaveLength(13);
    expect(new Set(augustDays.map((day) => day.dateISO)).size).toBe(31);
    expect(augustDays.at(-1)?.dateISO).toBe("2026-08-31");
    expect(legDays.length).toBeGreaterThan(0);
    expect(legDays.every((day) => day.workoutId === "lower-body-burn")).toBe(true);
  });
});
