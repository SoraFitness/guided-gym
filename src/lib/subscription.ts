import { useSyncExternalStore } from "react";

export type Plan = "weekly" | "monthly" | "yearly";

export interface Subscription {
  active: boolean;
  plan: Plan | null;
  since: string | null;
}

const KEY = "fitness:subscription";
const listeners = new Set<() => void>();
const EMPTY_SUBSCRIPTION: Subscription = {
  active: false,
  plan: null,
  since: null,
};

let cachedRaw: string | null | undefined;
let cachedSubscription: Subscription = EMPTY_SUBSCRIPTION;

function read(): Subscription {
  if (typeof window === "undefined") return EMPTY_SUBSCRIPTION;

  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedSubscription;

  cachedRaw = raw;
  try {
    cachedSubscription = raw ? (JSON.parse(raw) as Subscription) : EMPTY_SUBSCRIPTION;
  } catch {
    cachedSubscription = EMPTY_SUBSCRIPTION;
  }

  return cachedSubscription;
}

export function getSubscription(): Subscription {
  return read();
}

function write(sub: Subscription) {
  const raw = JSON.stringify(sub);
  localStorage.setItem(KEY, raw);
  cachedRaw = raw;
  cachedSubscription = sub;
  listeners.forEach((l) => l());
}

export function subscribe(plan: Plan) {
  write({ active: true, plan, since: new Date().toISOString() });
}

export function restorePurchases(): Subscription {
  // Stub: in a real app this would call StoreKit / RevenueCat.
  const current = read();
  listeners.forEach((l) => l());
  return current;
}

export function cancelSubscription() {
  write({ active: false, plan: null, since: null });
}

export function useSubscription() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY_SUBSCRIPTION,
  );
}

export const PLAN_PRICES: Record<
  Plan,
  { label: string; price: string; per: string; subtitle: string }
> = {
  weekly: { label: "Weekly", price: "$9.99", per: "/week", subtitle: "Billed weekly" },
  monthly: { label: "Monthly", price: "$19.99", per: "/month", subtitle: "Billed monthly" },
  yearly: {
    label: "Yearly",
    price: "$49.99",
    per: "/year",
    subtitle: "$4.17/month · save 79%",
  },
};
