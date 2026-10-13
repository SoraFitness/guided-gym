import { describe, expect, it } from "vitest";
import { getWorkout, workouts } from "./workouts";
import { splitLabelForWorkout, weeklyScheduleService } from "./weeklySchedule";
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

  it("does not assign a saved full-body workout to a focused leg-day Details link", () => {
    const fullBodyBuilder = workouts.find((workout) => workout.title.endsWith("Full Body Builder"));
    expect(fullBodyBuilder).toBeDefined();

    const schedule = weeklyScheduleService.generateSchedule(profile, [fullBodyBuilder!.id]);
    const legDay = schedule.find((day) => day.splitLabel === "Leg Day");
    const workout = legDay?.workoutId ? getWorkout(legDay.workoutId) : undefined;

    expect(legDay?.workoutId).not.toBe(fullBodyBuilder!.id);
    expect(legDay?.workoutTitle).toBe(workout?.title);
    expect(workout?.targetMuscles.some((muscle) => muscle === "legs" || muscle === "glutes")).toBe(
      true,
    );
    expect(
      workout?.targetMuscles.some((muscle) => ["chest", "back", "arms"].includes(muscle)),
    ).toBe(false);
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

const localNoon = (year: number, monthIndex: number, day: number) =>
  new Date(year, monthIndex, day, 12);

describe("smart split program schedule", () => {
  // Created on Thursday, September 10, 2026.
  const createdAt = localNoon(2026, 8, 10).toISOString();
  const smartProfile: Profile = {
    ...profile,
    workoutSplit: "auto",
    daysPerWeek: 4,
    completedAt: createdAt,
  };
  const plan = {
    workoutIds: ["push-strength", "pull-strength", "lower-body-burn", "upper-body-strength"],
    createdAt,
  };

  it("starts the plan with a training day on the day it was created", () => {
    const week = weeklyScheduleService.generateSchedule(smartProfile, plan, localNoon(2026, 8, 10));
    const byDate = new Map(week.map((day) => [day.dateISO, day]));

    expect(byDate.get("2026-09-07")?.isRestDay).toBe(true);
    expect(byDate.get("2026-09-10")).toMatchObject({
      workoutId: "push-strength",
      splitLabel: "Push Day",
      isRestDay: false,
    });
    expect(byDate.get("2026-09-11")).toMatchObject({
      workoutId: "pull-strength",
      splitLabel: "Pull Day",
    });
    expect(byDate.get("2026-09-12")?.isRestDay).toBe(true);
    expect(byDate.get("2026-09-13")).toMatchObject({
      workoutId: "lower-body-burn",
      splitLabel: "Leg Day",
    });
  });

  it("keeps rotating through the plan's sessions in order", () => {
    const nextWeek = weeklyScheduleService.generateSchedule(
      smartProfile,
      plan,
      localNoon(2026, 8, 17),
    );

    expect(
      nextWeek.filter((day) => !day.isRestDay).map((day) => [day.dateISO, day.workoutId]),
    ).toEqual([
      ["2026-09-14", "upper-body-strength"],
      ["2026-09-17", "push-strength"],
      ["2026-09-18", "pull-strength"],
      ["2026-09-20", "lower-body-burn"],
    ]);
  });

  it("does not rest every Smart Split member on the same weekday", () => {
    // Thursday used to be a rest day in every Smart Split template.
    const thursday = localNoon(2026, 8, 10);
    for (const daysPerWeek of [2, 3, 4, 5, 6] as const) {
      const week = weeklyScheduleService.generateSchedule(
        { ...smartProfile, daysPerWeek, completedAt: thursday.toISOString() },
        [],
        thursday,
      );
      expect(week.find((day) => day.dateISO === "2026-09-10")?.isRestDay).toBe(false);
    }
  });

  it("never fills a training day with a recovery session", () => {
    const week = weeklyScheduleService.generateSchedule(
      smartProfile,
      { ...plan, workoutIds: ["mobility-recovery", "push-strength"] },
      localNoon(2026, 8, 10),
    );

    expect(
      week.filter((day) => !day.isRestDay).every((day) => day.workoutId === "push-strength"),
    ).toBe(true);
  });

  it("labels catalog workouts by the kind of session they train", () => {
    const labelFor = (prefix: string) => {
      const workout = workouts.find((item) => item.id.startsWith(prefix));
      if (!workout) throw new Error(`No workout starts with ${prefix}`);
      return splitLabelForWorkout(workout);
    };

    expect(labelFor("sora-push-")).toBe("Push Day");
    expect(labelFor("sora-pull-")).toBe("Pull Day");
    expect(labelFor("sora-legs-")).toBe("Leg Day");
    expect(labelFor("sora-lower-")).toBe("Lower Body");
    expect(labelFor("sora-full-")).toBe("Full Body Strength");
    expect(labelFor("sora-core-")).toBe("Conditioning / Core");
    expect(labelFor("sora-hiit-")).toBe("Full Body Conditioning");
  });
});

describe("schedule without a saved plan", () => {
  it("follows the member's goal program and settings after they edit their profile", () => {
    const edited: Profile = {
      ...profile,
      goal: "lose_weight",
      goals: ["lose_weight"],
      equipment: "gym",
      sessionMinutes: 60,
      workoutSplit: "auto",
      // The program starts today, so today is always one of its sessions.
      completedAt: new Date().toISOString(),
    };
    const sessions = weeklyScheduleService
      .generateSchedule(edited)
      .filter((day) => !day.isRestDay && day.workoutId)
      .map((day) => getWorkout(day.workoutId!)!);

    expect(sessions.length).toBeGreaterThan(0);
    for (const workout of sessions) {
      expect(workout.equipment[0]).toBe("gym");
      expect(workout.duration).toBe(60);
      expect(workout.recommendedForGoals).toContain("lose_weight");
    }
  });
});
