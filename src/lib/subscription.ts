import { Capacitor } from "@capacitor/core";
import type { CustomerInfo, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useAuthSession } from "@/lib/authSession";

export type Plan = "weekly" | "monthly" | "yearly";

export interface PlanPrice {
  label: string;
  price: string;
  per: string;
  subtitle: string;
  badge?: string;
}

export type PlanPrices = Record<Plan, PlanPrice>;

export interface Subscription {
  active: boolean;
  plan: Plan | null;
  since: string | null;
  expiresAt: string | null;
  renewalRequired: boolean;
  ready: boolean;
  availablePlans: Record<Plan, boolean>;
  prices: PlanPrices;
  error: string | null;
}

const PRICE_LOADING_TEXT = "Loading App Store price…";

export const PLAN_PRICES: PlanPrices = {
  weekly: {
    label: "Weekly",
    price: "—",
    per: "/week",
    subtitle: PRICE_LOADING_TEXT,
  },
  monthly: {
    label: "Monthly",
    price: "—",
    per: "/month",
    subtitle: PRICE_LOADING_TEXT,
  },
  yearly: {
    label: "Yearly",
    price: "—",
    per: "/year",
    subtitle: PRICE_LOADING_TEXT,
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
  expiresAt: null,
  renewalRequired: false,
  ready: false,
  availablePlans: EMPTY_AVAILABLE_PLANS,
  prices: PLAN_PRICES,
  error: null,
};

const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY?.trim();
const ENTITLEMENT_ID = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";
const BROWSER_PREVIEW_ACCESS_EMAIL =
  import.meta.env.VITE_BROWSER_PREVIEW_ACCESS_EMAIL?.trim().toLowerCase();
const PURCHASES_OPERATION_TIMEOUT_MS = 12_000;
const OFFERINGS_RETRY_MS = 30_000;
const OFFERINGS_RETRY_DELAY_MS = 750;

const CHECKOUT_CONFIGURATION_ERROR =
  "RevenueCat checkout is not configured for this build. [RC-CONFIG]";
const CHECKOUT_OFFERING_ERROR =
  "Subscriptions are unavailable from RevenueCat right now. [RC-OFFERING]";
const CHECKOUT_PRODUCTS_ERROR =
  "Apple did not return any purchasable Ascendr subscriptions. [RC-EMPTY-PRODUCTS]";

type RevenueCatModule = typeof import("@revenuecat/purchases-capacitor");

const listeners = new Set<() => void>();
let subscription = EMPTY_SUBSCRIPTION;
let packagesByPlan: Partial<Record<Plan, PurchasesPackage>> = {};
let configured = false;
let configuredUserId: string | null = null;
let configureQueue: Promise<void> = Promise.resolve();
let revenueCatModule: RevenueCatModule | null = null;

async function getRevenueCatModule() {
  revenueCatModule ??= await import("@revenuecat/purchases-capacitor");
  return revenueCatModule;
}

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

function hasBrowserPreviewAccess(email: string | null) {
  return (
    import.meta.env.DEV &&
    !isNativePlatform() &&
    typeof email === "string" &&
    email.toLowerCase() === BROWSER_PREVIEW_ACCESS_EMAIL
  );
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
  switch (String(aPackage.packageType)) {
    case "ANNUAL":
      return "yearly";
    case "MONTHLY":
      return "monthly";
    case "WEEKLY":
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

function calculateYearlyDiscount(
  yearlyPackage: PurchasesPackage | undefined,
  monthlyPackage: PurchasesPackage | undefined,
) {
  const yearlyPrice = yearlyPackage?.product.price;
  const monthlyPrice = monthlyPackage?.product.price;
  if (
    typeof yearlyPrice !== "number" ||
    typeof monthlyPrice !== "number" ||
    yearlyPrice <= 0 ||
    monthlyPrice <= 0
  ) {
    return null;
  }

  const annualMonthlyCost = monthlyPrice * 12;
  return yearlyPrice < annualMonthlyCost
    ? Math.round((1 - yearlyPrice / annualMonthlyCost) * 100)
    : null;
}

function createPlanPrice(
  plan: Plan,
  aPackage: PurchasesPackage,
  yearlyDiscount: number | null,
): PlanPrice {
  const period = plan === "yearly" ? "/year" : plan === "monthly" ? "/month" : "/week";
  const monthlyPrice = aPackage.product.pricePerMonthString;

  return {
    label: PLAN_PRICES[plan].label,
    price: aPackage.product.priceString,
    per: period,
    subtitle:
      plan === "yearly" && monthlyPrice
        ? `${monthlyPrice}/month`
        : `Billed ${plan === "yearly" ? "yearly" : plan}`,
    badge: plan === "yearly" && yearlyDiscount ? `SAVE ${yearlyDiscount}%` : undefined,
  };
}

function applyCustomerInfo(customerInfo: CustomerInfo) {
  const entitlement = customerInfo.entitlements.all[ENTITLEMENT_ID];
  const active = entitlement?.isActive === true;

  updateSubscription({
    active,
    plan: active ? planFromProductIdentifier(entitlement.productIdentifier) : null,
    since: active ? entitlement.latestPurchaseDate : null,
    expiresAt: entitlement?.expirationDate ?? null,
    renewalRequired: !active && Boolean(entitlement?.expirationDate),
    ready: true,
  });
}

function applyOfferings(availablePackages: PurchasesPackage[]) {
  const nextPackages: Partial<Record<Plan, PurchasesPackage>> = {};
  const availablePlans = { ...EMPTY_AVAILABLE_PLANS };
  const prices = { ...PLAN_PRICES };

  for (const aPackage of availablePackages) {
    const plan = planFromPackage(aPackage);
    if (!plan || nextPackages[plan]) continue;
    nextPackages[plan] = aPackage;
    availablePlans[plan] = true;
  }

  const yearlyDiscount = calculateYearlyDiscount(nextPackages.yearly, nextPackages.monthly);
  for (const plan of PLAN_ORDER) {
    const aPackage = nextPackages[plan];
    if (aPackage) prices[plan] = createPlanPrice(plan, aPackage, yearlyDiscount);
  }

  packagesByPlan = nextPackages;
  const hasPackages = PLAN_ORDER.some((plan) => availablePlans[plan]);
  updateSubscription({
    availablePlans,
    prices,
    ready: true,
    error: hasPackages ? null : CHECKOUT_PRODUCTS_ERROR,
  });

  return hasPackages;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    operation.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

async function loadCurrentOffering() {
  const { Purchases } = await getRevenueCatModule();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await withTimeout(
        Purchases.getOfferings(),
        PURCHASES_OPERATION_TIMEOUT_MS,
        "RevenueCat offerings timed out.",
      );
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, OFFERINGS_RETRY_DELAY_MS));
      }
    }
  }

  throw lastError;
}

async function refreshSubscription(forceRefresh = false) {
  const { Purchases } = await getRevenueCatModule();
  if (forceRefresh) await Purchases.invalidateCustomerInfoCache();
  const offerings = await loadCurrentOffering();
  applyOfferings(offerings.current?.availablePackages ?? []);

  try {
    const { customerInfo } = await withTimeout(
      Purchases.getCustomerInfo(),
      PURCHASES_OPERATION_TIMEOUT_MS,
      "RevenueCat subscription check timed out.",
    );
    applyCustomerInfo(customerInfo);
  } catch (error) {
    console.warn("[revenuecat] Could not refresh customer information", error);
  }
}

async function syncRevenueCatUser(userId: string | null, email: string | null) {
  if (hasBrowserPreviewAccess(email)) {
    publish({
      ...EMPTY_SUBSCRIPTION,
      active: true,
      plan: "yearly",
      since: new Date().toISOString(),
      ready: true,
    });
    return;
  }

  if (!isNativePlatform()) {
    publish({
      ...EMPTY_SUBSCRIPTION,
      ready: true,
      error: "Purchases are available in the Ascendr iOS app.",
    });
    return;
  }

  if (!REVENUECAT_API_KEY?.startsWith("appl_")) {
    publish({ ...EMPTY_SUBSCRIPTION, ready: true, error: CHECKOUT_CONFIGURATION_ERROR });
    return;
  }

  try {
    const { LOG_LEVEL, Purchases } = await getRevenueCatModule();
    if (!configured) {
      if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await withTimeout(
        Purchases.configure(
          userId
            ? { apiKey: REVENUECAT_API_KEY, appUserID: userId }
            : { apiKey: REVENUECAT_API_KEY },
        ),
        PURCHASES_OPERATION_TIMEOUT_MS,
        "RevenueCat setup timed out.",
      );
      configured = true;
      configuredUserId = userId;
      void Purchases.addCustomerInfoUpdateListener(applyCustomerInfo).catch((error: unknown) => {
        console.warn("[revenuecat] Customer update listener is unavailable", error);
      });
    } else if (userId && configuredUserId !== userId) {
      packagesByPlan = {};
      publish({ ...EMPTY_SUBSCRIPTION, ready: false, error: null });
      const result = await Purchases.logIn({ appUserID: userId });
      configuredUserId = userId;
      applyCustomerInfo(result.customerInfo);
    } else if (!userId && configuredUserId) {
      packagesByPlan = {};
      publish({ ...EMPTY_SUBSCRIPTION, ready: false, error: null });
      const result = await Purchases.logOut();
      configuredUserId = null;
      applyCustomerInfo(result.customerInfo);
    }

    if (userId && email) {
      void Purchases.setEmail({ email }).catch((error: unknown) => {
        console.warn("[revenuecat] Could not sync subscriber email", error);
      });
    }

    await refreshSubscription();
  } catch (error) {
    console.error("[revenuecat] Could not load checkout", error);
    publish({
      ...subscription,
      active: false,
      plan: null,
      since: null,
      expiresAt: null,
      renewalRequired: false,
      ready: true,
      error: CHECKOUT_OFFERING_ERROR,
    });
  }
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const userId = session && session !== "loading" ? session.userId : null;
  const email = session && session !== "loading" ? session.email : null;

  useEffect(() => {
    if (session === "loading") return;

    const synchronize = () => {
      configureQueue = configureQueue
        .catch(() => undefined)
        .then(() => syncRevenueCatUser(userId, email));
    };

    synchronize();
    if (!isNativePlatform()) return;

    const retryId = window.setInterval(() => {
      if (!configured || Object.keys(packagesByPlan).length === 0) synchronize();
    }, OFFERINGS_RETRY_MS);

    return () => window.clearInterval(retryId);
  }, [email, session, userId]);

  useEffect(() => {
    if (!userId || !isNativePlatform()) return;

    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      configureQueue = configureQueue
        .catch(() => undefined)
        .then(() => (configured ? refreshSubscription(true) : undefined))
        .catch((error) => console.warn("[revenuecat] Could not refresh subscription", error));
    };

    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId]);

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
  if (!configured) throw new Error(subscription.error ?? CHECKOUT_CONFIGURATION_ERROR);
}

export async function purchaseSubscription(plan: Plan): Promise<Subscription> {
  await requireConfiguredRevenueCat();
  const { Purchases } = await getRevenueCatModule();
  const aPackage = packagesByPlan[plan];
  if (!aPackage) throw new Error(subscription.error ?? CHECKOUT_PRODUCTS_ERROR);

  const { customerInfo } = await Purchases.purchasePackage({ aPackage });
  applyCustomerInfo(customerInfo);
  return getSubscription();
}

export async function restorePurchases(): Promise<Subscription> {
  await requireConfiguredRevenueCat();
  const { Purchases } = await getRevenueCatModule();
  const { customerInfo } = await Purchases.restorePurchases();
  applyCustomerInfo(customerInfo);
  return getSubscription();
}

export function isPurchaseCancelled(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const purchaseError = error as { code?: unknown; userCancelled?: unknown };
  return purchaseError.userCancelled === true || purchaseError.code === "PURCHASE_CANCELLED_ERROR";
}
