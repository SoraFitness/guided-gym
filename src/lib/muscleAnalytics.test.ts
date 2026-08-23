import { describe, expect, it } from "vitest";
import { canonicalMuscleWeights, computeMuscleInsights } from "./muscleAnalytics";
import type { CompletedWorkout, ExerciseLog, SetLog } from "./workoutSessionStore";

const NOW = new Date("2026-08-21T12:00:00.000Z");

function workout(muscleGroup: string, completedAt: string, setCount: number): CompletedWorkout {
  const sets: SetLog[] = Array.from({ length: setCount }, (_, index) => ({
    setNumber: index + 1,
    actualReps: 10,
    weight: 50,
    unit: "lb",
    completed: true,
    completedAt,
    isExtraSet: false,
  }));
  const exercise: ExerciseLog = {
    id: "exercise-log",
    exerciseId: "exercise",
    exerciseName: "Test exercise",
    muscleGroup,
    isBodyweight: false,
    sets,
  };
  return {
    id: `workout-${muscleGroup}-${completedAt}`,
    workoutId: "test",
    workoutTitle: "Test workout",
    startedAt: completedAt,
    completedAt,
    durationMin: 45,
    calories: 250,
    unit: "lb",
    exercises: [exercise],
    totalSets: setCount,
    totalReps: setCount * 10,
    totalVolume: setCount * 500,
  };
}

describe("muscle analytics", () => {
  it("normalizes specific and compound catalogue muscle labels", () => {
    expect(canonicalMuscleWeights("Upper chest")).toEqual({ chest: 1 });
    expect(canonicalMuscleWeights("Rear delts")).toEqual({ shoulders: 1 });
    expect(canonicalMuscleWeights("Legs")).toEqual({ quads: 0.5, hamstrings: 0.5 });
    expect(canonicalMuscleWeights("Cardio")).toEqual({});
  });

  it("ranks untouched muscles ahead of a muscle trained moments ago", () => {
    const insights = computeMuscleInsights({
      history: [workout("Chest", "2026-08-21T11:00:00.000Z", 3)],
      now: NOW,
    });
    const chest = insights.find((item) => item.muscle === "chest");
    expect(chest).toMatchObject({ readiness: 1, coverage: 30, status: "Recovering" });
    expect(insights[0].muscle).not.toBe("chest");
  });

  it("uses focus areas as a capped priority bonus after recovery", () => {
    const history = [workout("Chest", "2026-08-17T12:00:00.000Z", 10)];
    const plain = computeMuscleInsights({ history, now: NOW }).find(
      (item) => item.muscle === "chest",
    );
    const focused = computeMuscleInsights({ history, focusAreas: ["chest"], now: NOW }).find(
      (item) => item.muscle === "chest",
    );
    expect(plain?.coverage).toBe(100);
    expect(focused?.priority).toBe((plain?.priority ?? 0) + 10);
  });

  it("flags workload beyond 125 percent and carries scan evidence separately", () => {
    const insight = computeMuscleInsights({
      history: [workout("Quads", "2026-08-18T12:00:00.000Z", 14)],
      scanScores: { quads: { score: 78, visibility: "clear" } },
      now: NOW,
    }).find((item) => item.muscle === "quads");
    expect(insight).toMatchObject({
      coverage: 140,
      status: "High load",
      scanScore: 78,
      scanVisibility: "clear",
    });
  });

  it("returns useful empty-history guidance without fabricating scan scores", () => {
    const insights = computeMuscleInsights({ history: [], now: NOW });
    expect(insights).toHaveLength(9);
    expect(insights.every((item) => item.status === "Needs volume")).toBe(true);
    expect(insights.every((item) => item.scanScore === undefined)).toBe(true);
  });
});
