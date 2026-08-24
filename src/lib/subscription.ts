import { Capacitor } from "@capacitor/core";
import {
  LOG_LEVEL,
  PACKAGE_TYPE,
  Purchases,
  type CustomerInfo,
  type PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useAuthSession } from "@/lib/authSession";

export type Plan = "weekly" | "monthly" | "yearly";

export interface PlanPrice {
  label: string;
  price: string;
  per: string;
  subtitle: string;
}

export type PlanPrices = Record<Plan, PlanPrice>;

export interface Subscription {
  active: boolean;
  plan: Plan | null;
  since: string | null;
  ready: boolean;
  availablePlans: Record<Plan, boolean>;
  prices: PlanPrices;
  error: string | null;
}

export const PLAN_PRICES: PlanPrices = {
  weekly: { label: "Weekly", price: "$9.99", per: "/week", subtitle: "Billed weekly" },
  monthly: { label: "Monthly", price: "$19.99", per: "/month", subtitle: "Billed monthly" },
  yearly: {
    label: "Yearly",
    price: "$49.99",
    per: "/year",
    subtitle: "$4.17/month · save 79%",
  },
};

const PLAN_ORDER: Plan[] = ["yearly", "monthly", "weekly"];
const EMPTY_AVAILABLE_PLANS: Record<Plan, boolean> = {
  weekly: false,
  monthly: false,
  yearly: false,
};
const EMPTY_SUBSCRIPTION: Subscription = {
  active: false,
  plan: null,
  since: null,
  ready: false,
  availablePlans: EMPTY_AVAILABLE_PLANS,
  prices: PLAN_PRICES,
  error: null,
};
const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY?.trim();
const ENTITLEMENT_ID = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";

const listeners = new Set<() => void>();
let subscription = EMPTY_SUBSCRIPTION;
let packagesByPlan: Partial<Record<Plan, PurchasesPackage>> = {};
let configured = false;
let configuredUserId: string | null = null;
let configureQueue: Promise<void> = Promise.resolve();

function publish(next: Subscription) {
  subscription = next;
  listeners.forEach((listener) => listener());
}

function updateSubscription(next: Partial<Subscription>) {
  publish({ ...subscription, ...next });
}

function isNativePlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function planFromIdentifier(identifier: string): Plan | null {
  const normalized = identifier.toLowerCase();
  if (
    normalized.includes("annual") ||
    normalized.includes("year") ||
    normalized.includes("yearly")
  ) {
    return "yearly";
  }
  if (normalized.includes("month") || normalized.includes("monthly")) return "monthly";
  if (normalized.includes("week") || normalized.includes("weekly")) return "weekly";
  return null;
}

function planFromPackage(aPackage: PurchasesPackage): Plan | null {
  switch (aPackage.packageType) {
    case PACKAGE_TYPE.ANNUAL:
      return "yearly";
    case PACKAGE_TYPE.MONTHLY:
      return "monthly";
    case PACKAGE_TYPE.WEEKLY:
      return "weekly";
    default:
      return planFromIdentifier(`${aPackage.identifier} ${aPackage.product.identifier}`);
  }
}

function planFromProductIdentifier(productIdentifier: string): Plan | null {
  const configuredPlan = PLAN_ORDER.find(
    (plan) => packagesByPlan[plan]?.product.identifier === productIdentifier,
  );
  return configuredPlan ?? planFromIdentifier(productIdentifier);
}

function createPlanPrice(plan: Plan, aPackage: PurchasesPackage): PlanPrice {
  const product = aPackage.product;
  const period = plan === "yearly" ? "/year" : plan === "monthly" ? "/month" : "/week";
  const monthlyPrice = product.pricePerMonthString;
  const subtitle =
    plan === "yearly" && monthlyPrice
      ? `${monthlyPrice}/month`
      : `Billed ${plan === "yearly" ? "yearly" : plan}`;

  return {
    label: PLAN_PRICES[plan].label,
    price: product.priceString,
    per: period,
    subtitle,
  };
}

function applyCustomerInfo(customerInfo: CustomerInfo) {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const active = entitlement?.isActive === true;

  updateSubscription({
    active,
    plan: active ? planFromProductIdentifier(entitlement.productIdentifier) : null,
    since: active ? entitlement.latestPurchaseDate : null,
    ready: true,
    error: null,
  });
}

function applyOfferings(availablePackages: PurchasesPackage[]) {
  const nextPackages: Partial<Record<Plan, PurchasesPackage>> = {};
  const prices = { ...PLAN_PRICES };
  const availablePlans = { ...EMPTY_AVAILABLE_PLANS };

  for (const aPackage of availablePackages) {
    const plan = planFromPackage(aPackage);
    if (!plan || nextPackages[plan]) continue;
    nextPackages[plan] = aPackage;
    prices[plan] = createPlanPrice(plan, aPackage);
    availablePlans[plan] = true;
  }

  packagesByPlan = nextPackages;
  updateSubscription({
    availablePlans,
    prices,
    error:
      availablePackages.length === 0 && !subscription.active
        ? "Subscriptions are not available yet. Please try again later."
        : null,
  });
}

function setupErrorMessage() {
  if (!isNativePlatform()) return "Purchases are available in the Ascendr iOS app.";
  if (!REVENUECAT_API_KEY) return "RevenueCat is not configured for this build.";
  return null;
}

async function refreshRevenueCatState() {
  const [{ customerInfo }, offerings] = await Promise.all([
    Purchases.getCustomerInfo(),
    Purchases.getOfferings(),
  ]);
  applyCustomerInfo(customerInfo);
  applyOfferings(offerings.current?.availablePackages ?? []);
}

async function syncRevenueCatUser(userId: string | null, email: string | null) {
  const setupError = setupErrorMessage();
  if (setupError) {
    publish({ ...EMPTY_SUBSCRIPTION, ready: true, error: setupError });
    return;
  }
  const apiKey = REVENUECAT_API_KEY;
  if (!apiKey) return;

  try {
    if (!configured) {
      if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({ apiKey, appUserID: userId ?? undefined });
      configured = true;
      configuredUserId = userId;
      await Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    } else if (configuredUserId !== userId) {
      const result = userId
        ? await Purchases.logIn({ appUserID: userId })
        : await Purchases.logOut();
      configuredUserId = userId;
      applyCustomerInfo(result.customerInfo);
    }

    if (email) await Purchases.setEmail({ email });
    await refreshRevenueCatState();
  } catch (error) {
    console.error("[revenuecat] Could not load subscription state", error);
    publish({
      ...subscription,
      active: false,
      plan: null,
      since: null,
      ready: true,
      error: "We couldn't verify your subscription. Please try again.",
    });
  }
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const userId = session && session !== "loading" ? session.userId : null;
  const email = session && session !== "loading" ? session.email : null;

  useEffect(() => {
    if (session === "loading") return;
    configureQueue = configureQueue
      .catch(() => undefined)
      .then(() => syncRevenueCatUser(userId, email));
  }, [email, session, userId]);

  return children;
}

export function getSubscription(): Subscription {
  return subscription;
}

export function useSubscription() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSubscription,
    () => EMPTY_SUBSCRIPTION,
  );
}

async function requireConfiguredRevenueCat() {
  await configureQueue;
  if (!configured) throw new Error(subscription.error ?? "RevenueCat is not ready.");
}

export async function purchaseSubscription(plan: Plan): Promise<Subscription> {
  await requireConfiguredRevenueCat();
  const aPackage = packagesByPlan[plan];
  if (!aPackage) {
    throw new Error("This subscription option is unavailable. Please try again later.");
  }

  const { customerInfo } = await Purchases.purchasePackage({ aPackage });
  applyCustomerInfo(customerInfo);
  return getSubscription();
}

export async function restorePurchases(): Promise<Subscription> {
  await requireConfiguredRevenueCat();
  const { customerInfo } = await Purchases.restorePurchases();
  applyCustomerInfo(customerInfo);
  return getSubscription();
}

export function isPurchaseCancelled(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const purchaseError = error as { code?: unknown; userCancelled?: unknown };
  return purchaseError.userCancelled === true || purchaseError.code === "PURCHASE_CANCELLED_ERROR";
}
