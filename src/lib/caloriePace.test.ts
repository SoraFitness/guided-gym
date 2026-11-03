import { describe, expect, it } from "vitest";
import {
  computePlan,
  formulaCaloriePlan,
  lbsToKg,
  paceAllowed,
  safeWeeklyLossKg,
  snapWeeklyChangeKg,
  type PlanInput,
} from "./calorieEngine";

const base: PlanInput = {
  gender: "male",
  age: 30,
  heightCm: 180,
  currentWeightKg: 100,
  goalWeightKg: 85,
  goalType: "lose_weight",
  activity: "moderate",
  targetDate: new Date(Date.now() + 84 * 86_400_000),
  splitPreset: "balanced",
};

describe("a chosen weekly pace", () => {
  it("takes the whole deficit from food, since maintenance already counts training", () => {
    const plan = computePlan({ ...base, weeklyChangeGoalKg: -lbsToKg(1) });
    expect(plan.maintenanceKcal - plan.recommendedIntakeKcal).toBeCloseTo(500, -1);
    expect(plan.exerciseBurnTargetKcal).toBe(0);
    expect(plan.weeklyChangeLb).toBeCloseTo(-1, 1);
    expect(plan.effectiveGoal).toBe("lose");
  });

  it("makes two pounds a week eat twice the deficit of one", () => {
    const one = computePlan({ ...base, weeklyChangeGoalKg: -lbsToKg(1) });
    const two = computePlan({ ...base, weeklyChangeGoalKg: -lbsToKg(2) });
    expect(one.maintenanceKcal - two.recommendedIntakeKcal).toBeCloseTo(1000, -1);
    expect(two.warnings).toEqual([]);
  });

  it("dates the goal from the pace", () => {
    const plan = computePlan({ ...base, weeklyChangeGoalKg: -0.5 });
    const weeks = (plan.estimatedGoalDate.getTime() - Date.now()) / (7 * 86_400_000);
    expect(weeks).toBeCloseTo(30, 0);
  });

  it("slows a pace past 1% of body weight instead of planning it", () => {
    const plan = computePlan({
      ...base,
      currentWeightKg: 70,
      goalWeightKg: 60,
      weeklyChangeGoalKg: -1,
    });
    expect(plan.weeklyChangeKg).toBeCloseTo(-0.7, 1);
    expect(plan.isAggressive).toBe(true);
    expect(plan.warnings.length).toBeGreaterThan(0);
  });

  it("stops cutting once the goal weight is reached", () => {
    const plan = computePlan({ ...base, currentWeightKg: 85, weeklyChangeGoalKg: -0.5 });
    expect(plan.recommendedIntakeKcal).toBe(plan.maintenanceKcal);
  });

  it("scales maintenance by the saved factor", () => {
    const plain = computePlan({ ...base, weeklyChangeGoalKg: 0, goalWeightKg: 100 });
    const adjusted = computePlan({
      ...base,
      goalWeightKg: 100,
      weeklyChangeGoalKg: 0,
      maintenanceFactor: 1.05,
    });
    expect(adjusted.maintenanceKcal).toBeCloseTo(plain.maintenanceKcal * 1.05, -1);
  });
});

describe("manual calories", () => {
  it("wins over the pace and reports the pace it works out to", () => {
    const plan = computePlan({ ...base, weeklyChangeGoalKg: -0.25, calorieTargetKcal: 2200 });
    expect(plan.recommendedIntakeKcal).toBe(2200);
    expect(plan.weeklyChangeKg).toBeCloseTo(-((plan.maintenanceKcal - 2200) * 7) / 7700, 2);
  });

  it("never goes under the intake floor", () => {
    const plan = computePlan({ ...base, calorieTargetKcal: 900 });
    expect(plan.recommendedIntakeKcal).toBe(1500);
    expect(plan.isUnsafe).toBe(true);
  });

  it("warns when a typed number is faster than recommended", () => {
    const plan = computePlan({ ...base, calorieTargetKcal: 1600 });
    expect(plan.isAggressive).toBe(true);
    expect(plan.warnings.join(" ")).toMatch(/1% of body weight/);
  });

  it("can't push an under-18 past the safe pace", () => {
    const plan = computePlan({ ...base, age: 16, calorieTargetKcal: 1500 });
    expect(plan.weeklyChangeKg).toBeCloseTo(-0.25, 1);
  });
});

describe("pace limits", () => {
  const body = { gender: "female", age: 25, heightCm: 165, currentWeightKg: 65 } as const;

  it("blocks paces too fast for the member", () => {
    expect(paceAllowed(lbsToKg(1), "lose", body, 2000)).toBe(true);
    expect(paceAllowed(lbsToKg(2), "lose", body, 2000)).toBe(false);
  });

  it("allows 2 lb/wk just under 200 lb", () => {
    expect(paceAllowed(lbsToKg(2), "lose", { ...base, currentWeightKg: 90 }, 2800)).toBe(true);
  });

  it("offers no deficit to someone already underweight", () => {
    expect(safeWeeklyLossKg({ ...body, currentWeightKg: 48 }, 1800)).toBe(0);
  });

  it("keeps the intake floor out of reach", () => {
    expect(safeWeeklyLossKg(body, 1300)).toBeCloseTo((100 * 7) / 7700, 3);
  });
});

describe("the suggested plan", () => {
  const answers = {
    gender: "male",
    age: 30,
    heightCm: 180,
    currentWeightKg: 100,
    goalWeightKg: 85,
    activity: "moderate",
    experience: "intermediate",
  } as const;

  it("uses training experience", () => {
    const beginner = formulaCaloriePlan({ ...answers, experience: "beginner" });
    const advanced = formulaCaloriePlan({ ...answers, experience: "advanced" });
    expect(beginner.maintenanceFactor).toBeLessThan(advanced.maintenanceFactor);
    expect(beginner.weeklyChangeKg).toBeLessThan(advanced.weeklyChangeKg);
  });

  it("points the right way for the goal weight", () => {
    expect(formulaCaloriePlan(answers).weeklyChangeKg).toBeLessThan(0);
    expect(formulaCaloriePlan({ ...answers, goalWeightKg: 110 }).weeklyChangeKg).toBeGreaterThan(0);
    expect(formulaCaloriePlan({ ...answers, goalWeightKg: 100 }).weeklyChangeKg).toBe(0);
  });

  it("snaps onto a chip without rounding up", () => {
    expect(snapWeeklyChangeKg(-0.6, "metric")).toBe(-0.5);
    expect(snapWeeklyChangeKg(-0.6, "imperial")).toBeCloseTo(-lbsToKg(1), 3);
    expect(snapWeeklyChangeKg(0, "metric")).toBe(0);
  });
});
