import { useSyncExternalStore } from "react";

const KEY = "fitness:tourCompleted";
const EVT = "fitness:tour-change";

function read(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY) cb();
  };
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTourCompleted(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}

export function markTourCompleted() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* no-op */
  }
  window.dispatchEvent(new Event(EVT));
}

export function resetTour() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
  window.dispatchEvent(new Event(EVT));
}
