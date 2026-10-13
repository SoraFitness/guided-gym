import { describe, expect, it } from "vitest";
import {
  activityFromLifestyle,
  computePlan,
  macrosFromPlan,
  proteinReferenceKg,
  tdee,
  bmrMifflin,
  type PlanInput,
} from "./calorieEngine";

const in12Weeks = () => {
  const date = new Date();
  date.setDate(date.getDate() + 84);
  return date;
};

const base: PlanInput = {
  gender: "male",
  age: 30,
  heightCm: 180,
  currentWeightKg: 85,
  goalWeightKg: 80,
  goalType: "lose_weight",
  activity: "moderate",
  targetDate: in12Weeks(),
  splitPreset: "balanced",
};

describe("goal direction", () => {
  it("never gives a fat-loss goal a calorie surplus", () => {
    for (const goalWeightKg of [85, 88, 95]) {
      const plan = computePlan({ ...base, goalWeightKg });
      expect(plan.recommendedIntakeKcal).toBeLessThan(plan.maintenanceKcal);
      expect(plan.effectiveGoal).toBe("recomp");
    }
  });

  it("turns a muscle goal with a lower goal weight into a recomposition", () => {
    const plan = computePlan({ ...base, goalType: "build_muscle", goalWeightKg: 78 });
    expect(plan.effectiveGoal).toBe("recomp");
    expect(plan.recommendedIntakeKcal).toBeLessThan(plan.maintenanceKcal);
  });

  it("keeps a lean surplus for a muscle goal at or above current weight", () => {
    const plan = computePlan({ ...base, goalType: "build_muscle", goalWeightKg: 90 });
    expect(plan.effectiveGoal).toBe("gain");
    expect(plan.recommendedIntakeKcal).toBeGreaterThan(plan.maintenanceKcal);
    expect(plan.recommendedIntakeKcal - plan.maintenanceKcal).toBeLessThan(
      plan.maintenanceKcal * 0.1,
    );
  });
});

describe("safe fat-loss pace", () => {
  it("caps a large goal at a safe deficit instead of the intake floor", () => {
    const plan = computePlan({ ...base, currentWeightKg: 110, goalWeightKg: 80 });
    expect(plan.isAggressive).toBe(true);
    expect(plan.dailyDeficitKcal).toBeLessThanOrEqual(Math.round(plan.maintenanceKcal * 0.25));
    expect(plan.recommendedIntakeKcal).toBeGreaterThan(2000);
    // ≤1% of body weight per week.
    expect(Math.abs(plan.weeklyChangeKg)).toBeLessThanOrEqual(1.1);
  });

  it("still respects the minimum intake for small, light members", () => {
    const plan = computePlan({
      ...base,
      gender: "female",
      age: 45,
      heightCm: 152,
      currentWeightKg: 55,
      goalWeightKg: 50,
      activity: "sedentary",
    });
    expect(plan.recommendedIntakeKcal).toBeGreaterThanOrEqual(1200);
  });
});

describe("protein", () => {
  it("doses protein against a sensible reference weight", () => {
    // 120 kg at 175 cm aiming for 85 kg: reference is the goal weight, not 120 kg.
    expect(proteinReferenceKg(120, 175, 85)).toBe(85);
    // A lean member uses their own weight.
    expect(proteinReferenceKg(70, 180, 75)).toBe(70);
    // A muscular member above BMI 25 is not cut below their goal weight.
    expect(proteinReferenceKg(90, 180, 88)).toBe(88);
  });

  it("lands in the 1.6–2.2 g/kg range of the reference weight", () => {
    for (const goalType of ["lose_weight", "build_muscle", "maintain", "recomp"] as const) {
      const plan = computePlan({ ...base, goalType, goalWeightKg: 80 });
      const macros = macrosFromPlan(plan, 85, { heightCm: 180, goalWeightKg: 80 });
      const perKg = macros.protein / proteinReferenceKg(85, 180, 80);
      expect(perKg).toBeGreaterThanOrEqual(1.6);
      expect(perKg).toBeLessThanOrEqual(2.2);
      const macroKcal = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
      expect(Math.abs(macroKcal - macros.kcal)).toBeLessThanOrEqual(12);
    }
  });
});

describe("activity", () => {
  it("does not treat a desk worker training 3x a week as moderately active", () => {
    expect(activityFromLifestyle(3, "seated")).toBe("light");
    expect(activityFromLifestyle(4, "seated")).toBe("moderate");
    expect(activityFromLifestyle(3, "mixed")).toBe("moderate");
    expect(activityFromLifestyle(5, "active")).toBe("athlete");
  });

  it("uses the Mifflin-St Jeor equation", () => {
    // 10·80 + 6.25·180 − 5·30 + 5 = 1780 kcal BMR for an 80 kg, 180 cm, 30-year-old man.
    expect(bmrMifflin({ gender: "male", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
    expect(Math.round(tdee(1780, "light"))).toBe(2448);
  });
});
