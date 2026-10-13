import { describe, expect, it } from "vitest";
import type { Profile } from "./profile";
import { workouts } from "./workouts";
import {
  CORE_FINISHER_SUFFIX,
  findFinisherExercise,
  personalizeWorkout,
} from "./workoutPersonalization";

const profile = (patch: Partial<Profile>): Profile =>
  ({
    name: "Member",
    goal: "lose_weight",
    experience: "intermediate",
    equipment: "gym",
    daysPerWeek: 4,
    sessionMinutes: 45,
    focusAreas: ["core", "chest"],
    currentWeightKg: 82,
    goalWeightKg: 78,
    heightCm: 180,
    age: 28,
    gender: "male",
    activityLevel: "moderate",
    goalTargetDate: new Date().toISOString(),
    deficitSplit: "balanced",
    nutritionPlan: "fat_loss",
    completedAt: "",
    ...patch,
  }) as Profile;

const strength = workouts.find(
  (workout) =>
    workout.category === "Strength" &&
    workout.equipment.includes("gym") &&
    workout.exercises.every((exercise) => !/core|abs|oblique/i.test(exercise.muscleGroup)),
)!;

describe("core finisher", () => {
  it("adds two ab moves to strength days when Core is a focus", () => {
    const personalized = personalizeWorkout(strength, profile({}));
    const added = personalized.exercises.slice(strength.exercises.length);
    expect(added).toHaveLength(2);
    expect(added.every((exercise) => exercise.id.endsWith(CORE_FINISHER_SUFFIX))).toBe(true);
    expect(personalized.duration).toBe(strength.duration + 5);
  });

  it("leaves workouts alone without a Core focus or on non-strength days", () => {
    expect(personalizeWorkout(strength, profile({ focusAreas: ["chest"] }))).toBe(strength);
    const hiit = workouts.find((workout) => workout.category === "HIIT")!;
    expect(personalizeWorkout(hiit, profile({}))).toBe(hiit);
  });

  it("only uses moves the member's equipment allows", () => {
    const home = workouts.find(
      (workout) =>
        workout.category === "Strength" &&
        workout.equipment.includes("none") &&
        workout.exercises.every((exercise) => !/core|abs|oblique/i.test(exercise.muscleGroup)),
    )!;
    const personalized = personalizeWorkout(home, profile({ equipment: "none" }));
    const names = personalized.exercises
      .slice(home.exercises.length)
      .map((exercise) => exercise.name);
    expect(names).not.toContain("Hanging Leg Raise");
    expect(names).not.toContain("Cable Crunch");
  });

  it("can rebuild a finisher exercise from its id for the demo screen", () => {
    expect(findFinisherExercise(`plank${CORE_FINISHER_SUFFIX}`)?.name).toBe("Plank");
    expect(findFinisherExercise("plank")).toBeUndefined();
  });
});
