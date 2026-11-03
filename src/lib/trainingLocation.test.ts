import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "./profile";
import { getTrainingSetupOverride, setTrainingSetupOverride } from "./trainingLocation";
import { weeklyScheduleService } from "./weeklySchedule";
import { getWorkout, workouts } from "./workouts";
import { builtForEquipment, swapWorkoutForSetup } from "./workoutProgram";
import { personalizeWorkout } from "./workoutPersonalization";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});
vi.stubGlobal("window", { dispatchEvent: () => true });

const profile: Profile = {
  name: "Member",
  goal: "build_muscle",
  experience: "intermediate",
  equipment: "gym",
  daysPerWeek: 6,
  sessionMinutes: 45,
  focusAreas: ["chest", "back", "core"],
  currentWeightKg: 80,
  goalWeightKg: 80,
  heightCm: 180,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goalTargetDate: "2027-01-01T12:00:00.000Z",
  deficitSplit: "balanced",
  nutritionPlan: "muscle_gain",
  completedAt: new Date().toISOString(),
};

beforeEach(() => store.clear());

describe("today's training location", () => {
  it("forgets the choice the next day", () => {
    setTrainingSetupOverride("none");
    expect(getTrainingSetupOverride()).toBe("none");
    store.set("fitness:trainingLocation", JSON.stringify({ day: "2020-1-1", setup: "none" }));
    expect(getTrainingSetupOverride()).toBeNull();
  });

  it("moves only today's session and keeps the session type", () => {
    const planned = weeklyScheduleService.generateSchedule(profile);
    setTrainingSetupOverride("none");
    const swapped = weeklyScheduleService.generateSchedule(profile);
    const today = planned.findIndex((day) => day.isToday);
    expect(planned[today].isRestDay).toBe(false);
    expect(swapped[today].workoutId).not.toBe(planned[today].workoutId);
    expect(swapped[today].splitLabel).toBe(planned[today].splitLabel);
    expect(swapped[today].equipment).toBe("Bodyweight");
    expect(swapped.filter((_, index) => index !== today)).toEqual(
      planned.filter((_, index) => index !== today),
    );
  });
});

describe("swapWorkoutForSetup", () => {
  it("finds the same generated session for the new setup", () => {
    const gym = workouts.find((workout) => workout.id.startsWith("sora-push-gym-"))!;
    const home = swapWorkoutForSetup(gym, "none", profile);
    expect(home.id).toBe(gym.id.replace("-gym-", "-none-"));
    expect(home.targetMuscles).toEqual(gym.targetMuscles);
    expect(home.duration).toBe(gym.duration);
  });

  it("swaps a hand-written workout for one built for the new setup", () => {
    const home = swapWorkoutForSetup(getWorkout("push-strength")!, "none", profile);
    expect(builtForEquipment(home, "none")).toBe(true);
    expect(home.id).not.toBe("push-strength");
  });

  it("goes home to gym too", () => {
    const home = workouts.find((workout) => workout.id.startsWith("sora-legs-none-"))!;
    expect(builtForEquipment(swapWorkoutForSetup(home, "gym", profile), "gym")).toBe(true);
  });

  it("leaves a workout already built for that setup alone", () => {
    const gym = workouts.find((workout) => workout.id.startsWith("sora-push-gym-"))!;
    expect(swapWorkoutForSetup(gym, "gym", profile)).toBe(gym);
  });
});

describe("the core finisher on a swapped day", () => {
  it("asks a gym member for no gym machines on a home workout", () => {
    const home = workouts.find(
      (workout) => workout.id.startsWith("sora-push-none-") && workout.category === "Strength",
    )!;
    const names = personalizeWorkout(home, profile).exercises.map((exercise) => exercise.name);
    expect(names.join(" ")).not.toMatch(/cable|hanging/i);
  });
});
