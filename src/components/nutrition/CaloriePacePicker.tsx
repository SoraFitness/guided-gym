import { AlertTriangle, Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { useState } from "react";
import { cardClass, Kicker } from "@/components/app/kit";
import {
  kgToLbs,
  lbsToKg,
  paceAllowed,
  paceOptionsKg,
  samePace,
  weightDirection,
  type CaloriePlanEstimate,
} from "@/lib/calorieEngine";
import { nutritionPlanFor } from "@/lib/nutritionService";
import type { Profile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export type CaloriePaceValue = Pick<
  Profile,
  "maintenanceFactor" | "weeklyChangeGoalKg" | "calorieTargetKcal"
>;

const formatPace = (kg: number, imperial: boolean) => {
  const value = imperial ? kgToLbs(kg) : kg;
  return `${Number(value.toFixed(2))} ${imperial ? "lb" : "kg"}`;
};

function digits(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, 4);
}

/**
 * Maintenance, how fast to go, and what that means to eat. Everything can be typed in
 * by hand; the numbers shown always come from the same plan the rest of the app uses.
 */
export function CaloriePacePicker({
  profile,
  value,
  onChange,
  suggestion,
  loading = false,
  maintenanceLabel = "Calculated from your body and training",
}: {
  profile: Profile;
  value: CaloriePaceValue;
  onChange: (next: CaloriePaceValue) => void;
  /** What to offer as the recommended pace and to reset a typed maintenance back to. */
  suggestion?: CaloriePlanEstimate;
  loading?: boolean;
  maintenanceLabel?: string;
}) {
  const imperial = profile.units === "imperial";
  const plan = nutritionPlanFor({ ...profile, ...value });
  const direction = weightDirection(profile.currentWeightKg, profile.goalWeightKg);
  const [editingMaintenance, setEditingMaintenance] = useState(false);
  const [customPaceOpen, setCustomPaceOpen] = useState(false);
  const [caloriesOpen, setCaloriesOpen] = useState(value.calorieTargetKcal != null);

  const maintenanceIsSuggested =
    suggestion != null && value.maintenanceFactor === suggestion.maintenanceFactor;
  const options =
    direction === "maintain" ? [] : paceOptionsKg(profile.units ?? "metric", direction);
  const sign = direction === "lose" ? -1 : 1;
  const manualCalories = value.calorieTargetKcal != null;
  const selectedOption =
    !manualCalories && options.some((kg) => samePace(sign * kg, value.weeklyChangeGoalKg));
  const anyAllowed =
    direction !== "maintain" &&
    options.some((kg) => paceAllowed(kg, direction, profile, plan.maintenanceKcal));
  const fmtDate = plan.estimatedGoalDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const verb = plan.weeklyChangeKg < 0 ? "Lose" : "Gain";
  const showsPace = Math.abs(plan.dailyDeficitKcal) >= 50;

  return (
    <div className="space-y-3">
      <section className={cn(cardClass, "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Kicker accent>Daily maintenance</Kicker>
            {editingMaintenance ? (
              <input
                autoFocus
                inputMode="numeric"
                aria-label="Your daily maintenance calories"
                defaultValue={plan.maintenanceKcal}
                onChange={(event) => {
                  const kcal = Number(digits(event.target.value));
                  if (kcal >= 800) {
                    onChange({ ...value, maintenanceFactor: kcal / plan.formulaMaintenanceKcal });
                  }
                }}
                onBlur={() => setEditingMaintenance(false)}
                className="mt-1.5 h-11 w-32 rounded-xl border border-neon/40 bg-white/[0.04] px-3 text-[22px] font-bold tabular-nums outline-none"
              />
            ) : (
              <p className="mt-1.5 text-[34px] font-bold leading-none tracking-[-0.03em] tabular-nums">
                {plan.maintenanceKcal.toLocaleString()}
                <span className="ml-1.5 text-[14px] font-semibold tracking-normal text-muted-foreground">
                  kcal
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditingMaintenance((open) => !open)}
            aria-label="Enter your own maintenance calories"
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-white/[0.05] px-3 text-[13px] font-semibold"
          >
            <Pencil className="size-3" /> Edit
          </button>
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-neon" /> AI is checking your numbers…
            </>
          ) : maintenanceIsSuggested && suggestion?.source === "ai" ? (
            <>
              <Sparkles className="size-3.5 text-neon" /> AI estimate from your body and training
            </>
          ) : maintenanceIsSuggested || value.maintenanceFactor == null ? (
            maintenanceLabel
          ) : (
            <>
              Your number
              {suggestion && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...value, maintenanceFactor: suggestion.maintenanceFactor })
                  }
                  className="font-semibold text-neon"
                >
                  · Use our estimate
                </button>
              )}
            </>
          )}
        </p>
      </section>

      {direction !== "maintain" && (
        <section className={cn(cardClass, "p-4")}>
          <Kicker>{direction === "lose" ? "How fast to lose it" : "How fast to gain it"}</Kicker>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {options.map((kg) => {
              const allowed = paceAllowed(kg, direction, profile, plan.maintenanceKcal);
              const active = !manualCalories && samePace(sign * kg, value.weeklyChangeGoalKg);
              const recommended = suggestion && samePace(sign * kg, suggestion.weeklyChangeKg);
              return (
                <button
                  key={kg}
                  type="button"
                  disabled={!allowed}
                  aria-pressed={active}
                  onClick={() => {
                    setCustomPaceOpen(false);
                    setCaloriesOpen(false);
                    onChange({
                      ...value,
                      weeklyChangeGoalKg: sign * kg,
                      calorieTargetKcal: undefined,
                    });
                  }}
                  className={cn(
                    "relative min-h-[62px] rounded-2xl border px-3 py-2.5 text-left transition",
                    active ? "border-neon bg-neon/10" : "border-hairline bg-black/20",
                    !allowed && "opacity-40",
                  )}
                >
                  <span className="block text-[15px] font-bold tabular-nums">
                    {formatPace(kg, imperial)}
                    <span className="text-[12px] font-semibold text-muted-foreground"> /wk</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {!allowed
                      ? "Too fast for you"
                      : recommended
                        ? suggestion?.source === "ai"
                          ? "AI pick"
                          : "Recommended"
                        : `${direction === "lose" ? "−" : "+"}${(Math.round((kg * 1100) / 10) * 10).toLocaleString()} kcal/day`}
                  </span>
                  {active && (
                    <Check
                      className="absolute right-2.5 top-2.5 size-4 text-neon"
                      strokeWidth={3}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {!anyAllowed && (
            <p className="mt-3 text-[13px] leading-snug text-muted-foreground">
              Your current weight doesn't leave room for a safe{" "}
              {direction === "lose" ? "cut" : "bulk"}, so this keeps you at maintenance.
            </p>
          )}
          {anyAllowed &&
            (customPaceOpen || (!selectedOption && !manualCalories && value.weeklyChangeGoalKg) ? (
              <label className="mt-2 flex items-center gap-2 rounded-2xl border border-hairline bg-black/20 px-3">
                <span className="text-[13px] text-muted-foreground">Custom</span>
                <input
                  inputMode="decimal"
                  aria-label={`Custom pace in ${imperial ? "pounds" : "kilograms"} per week`}
                  defaultValue={
                    value.weeklyChangeGoalKg
                      ? Number(
                          (imperial
                            ? kgToLbs(Math.abs(value.weeklyChangeGoalKg))
                            : Math.abs(value.weeklyChangeGoalKg)
                          ).toFixed(2),
                        )
                      : ""
                  }
                  onChange={(event) => {
                    const amount = parseFloat(event.target.value);
                    if (!Number.isFinite(amount) || amount <= 0) return;
                    onChange({
                      ...value,
                      weeklyChangeGoalKg: sign * (imperial ? lbsToKg(amount) : amount),
                      calorieTargetKcal: undefined,
                    });
                  }}
                  className="h-11 min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold tabular-nums outline-none"
                />
                <span className="text-[13px] text-muted-foreground">
                  {imperial ? "lb" : "kg"}/wk
                </span>
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setCustomPaceOpen(true)}
                className="mt-2 h-9 w-full text-[13px] font-semibold text-muted-foreground"
              >
                Enter a custom pace
              </button>
            ))}
          {suggestion?.reason && !loading && (
            <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-muted-foreground">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-neon" />
              {suggestion.reason}
            </p>
          )}
        </section>
      )}

      <section className="rounded-[24px] border border-neon/30 bg-neon/[0.07] p-4">
        <Kicker accent>Eat per day</Kicker>
        <p className="mt-1.5 text-[42px] font-bold leading-none tracking-[-0.04em] tabular-nums">
          {plan.recommendedIntakeKcal.toLocaleString()}
          <span className="ml-1.5 text-[14px] font-semibold tracking-normal text-muted-foreground">
            kcal
          </span>
        </p>
        <p className="mt-2 text-[14px] leading-snug text-foreground/85">
          {showsPace ? (
            <>
              {verb} about{" "}
              <span className="font-bold tabular-nums">
                {formatPace(Math.abs(plan.weeklyChangeKg), imperial)}
              </span>{" "}
              a week
              {direction !== "maintain" && ` · reach your goal around ${fmtDate}`}
            </>
          ) : (
            "This holds your weight steady."
          )}
        </p>

        {caloriesOpen ? (
          <label className="mt-3 flex items-center gap-2 rounded-2xl border border-hairline bg-black/25 px-3">
            <span className="text-[13px] text-muted-foreground">My calories</span>
            <input
              inputMode="numeric"
              autoFocus={!manualCalories}
              aria-label="Your daily calorie target"
              defaultValue={value.calorieTargetKcal ?? ""}
              onChange={(event) => {
                const kcal = Number(digits(event.target.value));
                if (kcal >= 800) onChange({ ...value, calorieTargetKcal: kcal });
                else if (!kcal) onChange({ ...value, calorieTargetKcal: undefined });
              }}
              className="h-11 min-w-0 flex-1 bg-transparent text-right text-[15px] font-bold tabular-nums outline-none"
            />
            <span className="text-[13px] text-muted-foreground">kcal</span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setCaloriesOpen(true)}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-black/20 px-3 text-[13px] font-semibold"
          >
            <Pencil className="size-3" /> Set my own calories
          </button>
        )}
      </section>

      {plan.warnings.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-[18px] border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div className="space-y-1 text-[13px] leading-snug text-amber-100/90">
            {plan.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
