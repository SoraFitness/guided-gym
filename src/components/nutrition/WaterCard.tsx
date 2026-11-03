import { Check, Droplet, Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { cardClass, Kicker, LevelMeter } from "@/components/app/kit";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/profile";
import {
  addWater,
  formatWater,
  ozToMl,
  removeWater,
  useWaterLog,
  waterGoalMl,
  waterOn,
  waterQuickAddsMl,
  waterTotalMl,
} from "@/lib/waterStore";

export const WATER_COLOR = "var(--color-analytics-teal)";

/** Suggested water for the day and the buttons to log it, on the day Fuel is showing. */
export function WaterCard({ profile, day }: { profile: Profile; day: Date }) {
  const entries = waterOn(useWaterLog(), day);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const units = profile.units;
  const imperial = units === "imperial";
  const goal = waterGoalMl(profile);
  const total = waterTotalMl(entries);
  const left = goal - total;
  const isToday = day.toDateString() === new Date().toDateString();

  // Today's water is logged at the current time; a past day's lands on that day.
  const log = (ml: number) => addWater(ml, isToday ? new Date() : day);
  const logCustom = () => {
    const amount = parseFloat(custom);
    if (!Number.isFinite(amount) || amount <= 0) return;
    log(imperial ? ozToMl(amount) : amount);
    setCustom("");
    setCustomOpen(false);
  };

  return (
    <section className={cn(cardClass, "mt-3 p-4")} aria-label="Water">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Kicker>Water</Kicker>
          <p className="mt-1.5 flex items-baseline gap-1.5 tabular-nums">
            <span className="text-[28px] font-bold leading-none tracking-[-0.03em]">
              {formatWater(total, units)}
            </span>
            <span className="text-[14px] font-medium text-muted-foreground">
              of {formatWater(goal, units)}
            </span>
          </p>
        </div>
        <span
          className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white/[0.05]"
          style={{ color: WATER_COLOR }}
        >
          {left <= 0 ? (
            <Check className="size-5" strokeWidth={3} />
          ) : (
            <Droplet className="size-5" />
          )}
        </span>
      </div>

      <LevelMeter value={goal ? total / goal : 0} color={WATER_COLOR} className="mt-3" />
      <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">
        {left <= 0
          ? "You've hit your suggested water for the day."
          : `${formatWater(left, units)} to go. Suggested from your weight and training.`}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {waterQuickAddsMl(units).map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => log(ml)}
            aria-label={`Log ${formatWater(ml, units)} of water`}
            className="h-11 rounded-[14px] border border-hairline bg-white/[0.05] text-[13px] font-semibold tabular-nums transition active:scale-95"
          >
            +{formatWater(ml, units)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((open) => !open)}
          aria-expanded={customOpen}
          aria-label="Log a custom amount of water"
          className="grid h-11 place-items-center rounded-[14px] border border-hairline bg-white/[0.05] transition active:scale-95"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {customOpen && (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            logCustom();
          }}
        >
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-hairline bg-black/20 px-3">
            <input
              autoFocus
              inputMode="decimal"
              value={custom}
              aria-label={`Amount in ${imperial ? "ounces" : "millilitres"}`}
              placeholder={imperial ? "12" : "330"}
              onChange={(event) => setCustom(event.target.value.replace(/[^0-9.]/g, ""))}
              className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold tabular-nums outline-none"
            />
            <span className="text-[13px] text-muted-foreground">{imperial ? "oz" : "ml"}</span>
          </label>
          <button
            type="submit"
            className="h-11 rounded-[14px] bg-neon px-4 text-[14px] font-bold text-neon-foreground active:scale-95"
          >
            Log
          </button>
        </form>
      )}

      {entries.length > 0 && (
        <button
          type="button"
          onClick={() => removeWater(entries[entries.length - 1].id)}
          className="mt-2.5 inline-flex h-8 items-center gap-1.5 text-[13px] font-semibold text-muted-foreground"
        >
          <Undo2 className="size-3.5" /> Undo last (
          {formatWater(entries[entries.length - 1].ml, units)})
        </button>
      )}
    </section>
  );
}
