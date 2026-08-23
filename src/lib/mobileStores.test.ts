// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadLog } from "./foods";
import { addEntry } from "./nutritionStore";
import { getWeightLogEntries, logWeight } from "./weightLogStore";
import { clearSession, parseDurationSeconds, startSession } from "./workoutSessionStore";

describe("mobile LAN storage flows", () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
    vi.stubGlobal("crypto", undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("starts and persists a workout without secure-context UUID APIs", () => {
    const session = startSession("mobile-test", "Mobile Test", [
      { id: "squat", name: "Squat", sets: 3, reps: "8", muscleGroup: "Legs" },
    ]);

    expect(session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(localStorage.getItem("fitness:activeSession:v2") ?? "null")).toMatchObject({
      workoutId: "mobile-test",
    });
  });

  it("seeds timed exercises as timer intervals instead of rep sets", () => {
    const session = startSession("timed-test", "Timed Test", [
      { id: "plank", name: "Plank", sets: 3, time: "45s", muscleGroup: "Core" },
    ]);

    expect(session.exercises[0].sets[0]).toMatchObject({
      plannedDurationSec: 45,
      actualReps: 0,
    });
    expect(parseDurationSeconds("5 min")).toBe(300);
    expect(parseDurationSeconds("60s/side")).toBe(60);
  });

  it("saves a meal without secure-context UUID APIs", () => {
    addEntry({
      meal: "Breakfast",
      servings: 1,
      custom: {
        name: "Oats",
        serving: "1 bowl",
        kcal: 300,
        protein: 10,
        carbs: 50,
        fat: 6,
        source: "manual",
      },
    });

    expect(loadLog()).toHaveLength(1);
    expect(loadLog()[0].custom?.name).toBe("Oats");
  });

  it("logs weight without secure-context UUID APIs", () => {
    logWeight(82, new Date("2026-08-20T12:00:00.000Z"));

    expect(getWeightLogEntries()).toHaveLength(1);
    expect(getWeightLogEntries()[0]).toMatchObject({ kg: 82 });
  });
});
