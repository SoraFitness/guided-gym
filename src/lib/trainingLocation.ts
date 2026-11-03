import { useMemo, useSyncExternalStore } from "react";
import { useProfile, type EquipmentSetup, type Profile } from "./profile";

// "Not going to the gym today": swaps today's session for the same training built for
// another setup. It lasts only for the day, so the member's plan is back tomorrow.
// Device-local, like the weekly completion state.

const KEY = "fitness:trainingLocation";
const EVT = "fitness:training-location-change";

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** The setup picked for today, or null when today follows the member's own setup. */
export function getTrainingSetupOverride(): EquipmentSetup | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { day?: string; setup?: EquipmentSetup };
    return stored.day === localDayKey(new Date()) ? (stored.setup ?? null) : null;
  } catch {
    return null;
  }
}

/** Pass the member's own setup (or null) to go back to their plan. */
export function setTrainingSetupOverride(setup: EquipmentSetup | null) {
  if (setup) {
    localStorage.setItem(KEY, JSON.stringify({ day: localDayKey(new Date()), setup }));
  } else {
    localStorage.removeItem(KEY);
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === KEY) callback();
  };
  window.addEventListener(EVT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTrainingSetupOverride(): EquipmentSetup | null {
  return useSyncExternalStore(subscribe, getTrainingSetupOverride, () => null);
}

/** The member's profile as today's workout lists should see it. */
export function useProfileForToday(): Profile | null {
  const { profile } = useProfile();
  const override = useTrainingSetupOverride();
  return useMemo(
    () => (profile && override ? { ...profile, equipment: override } : profile),
    [profile, override],
  );
}

export interface TrainingLocationOption {
  setup: EquipmentSetup;
  label: string;
}

/** The choices for today. Home with gear keeps whatever kit the member said they own. */
export function trainingLocationOptions(profile: Profile): TrainingLocationOption[] {
  const ownsGear = profile.equipment === "dumbbells" || profile.equipment === "mixed";
  return [
    { setup: "gym", label: "Gym" },
    {
      setup: ownsGear ? profile.equipment : "dumbbells",
      label: profile.equipment === "mixed" ? "Mixed" : "Dumbbells",
    },
    { setup: "none", label: "Home" },
  ];
}
