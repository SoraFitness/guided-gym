import { describe, expect, it } from "vitest";
import type { CompletedWorkout, ExerciseLog } from "./workoutSessionStore";
import { getProgressionTarget, getWorkoutMomentum } from "./trainingIntelligence";

function exercise(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id: "bench-log",
    exerciseId: "bench",
    exerciseName: "Bench Press",
    muscleGroup: "Chest",
    isBodyweight: false,
    sets: [
      {
        setNumber: 1,
        actualReps: 11,
        weight: 50,
        unit: "lb",
        completed: true,
        isExtraSet: false,
      },
    ],
    ...overrides,
  };
}

function workout(overrides: Partial<CompletedWorkout> = {}): CompletedWorkout {
  const exercises = overrides.exercises ?? [exercise()];
  return {
    id: "workout-1",
    workoutId: "upper",
    workoutTitle: "Upper Strength",
    startedAt: "2026-08-20T10:00:00.000Z",
    completedAt: "2026-08-20T11:00:00.000Z",
    durationMin: 45,
    calories: 300,
    unit: "lb",
    exercises,
    totalSets: 3,
    totalReps: 30,
    totalVolume: 1500,
    ...overrides,
  };
}

describe("training intelligence", () => {
  it("uses double progression before suggesting a load increase", () => {
    const current = exercise({ sets: [{ ...exercise().sets[0], completed: false }] });
    const target = getProgressionTarget(current, [workout()], "lb");

    expect(target).toMatchObject({ kind: "reps", targetWeight: 50, targetReps: 12 });
  });

  it("suggests a small load increase after twelve clean reps", () => {
    const prior = workout({
      exercises: [exercise({ sets: [{ ...exercise().sets[0], actualReps: 12 }] })],
    });
    const current = exercise({ sets: [{ ...exercise().sets[0], completed: false }] });
    const target = getProgressionTarget(current, [prior], "lb");

    expect(target).toMatchObject({ kind: "weight", targetWeight: 55, targetReps: 10 });
  });

  it("adds a rep for bodyweight movements", () => {
    const prior = workout({
      exercises: [
        exercise({
          exerciseId: "push-up",
          exerciseName: "Push-up",
          isBodyweight: true,
          sets: [{ ...exercise().sets[0], weight: 0, actualReps: 15 }],
        }),
      ],
    });
    const current = exercise({
      exerciseId: "push-up",
      exerciseName: "Push-up",
      isBodyweight: true,
      sets: [{ ...exercise().sets[0], weight: 0, completed: false }],
    });

    expect(getProgressionTarget(current, [prior], "lb")).toMatchObject({
      kind: "reps",
      targetWeight: 0,
      targetReps: 16,
    });
  });

  it("compares a completed session and marks genuine strength records", () => {
    const previous = workout();
    const current = workout({
      id: "workout-2",
      completedAt: "2026-08-22T11:00:00.000Z",
      totalVolume: 1800,
      exercises: [exercise({ sets: [{ ...exercise().sets[0], weight: 55 }] })],
    });
    const momentum = getWorkoutMomentum(current, [current, previous]);

    expect(momentum.comparison).toMatchObject({ label: "Volume", changePercent: 20 });
    expect(momentum.personalRecords).toEqual([
      { exerciseName: "Bench Press", value: "55 lb × 11" },
    ]);
  });
});
