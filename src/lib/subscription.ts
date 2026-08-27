import { Capacitor } from "@capacitor/core";
import {
  LOG_LEVEL,
  PACKAGE_TYPE,
  Purchases,
  type CustomerInfo,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from "@revenuecat/purchases-capacitor";
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

export const PLAN_PRICES: PlanPrices = {
  weekly: {
    label: "Weekly",
    price: "US$9.99",
    per: "/week",
    subtitle: "Billed weekly in USD",
  },
  monthly: {
    label: "Monthly",
    price: "US$19.99",
    per: "/month",
    subtitle: "Billed monthly in USD",
  },
  yearly: {
    label: "Yearly",
    price: "US$49.99",
    per: "/year",
    subtitle: "US$4.17/month · billed yearly in USD",
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
const BUNDLED_REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY?.trim();
const ENTITLEMENT_ID = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID?.trim() || "pro";
const BROWSER_PREVIEW_ACCESS_EMAIL =
  import.meta.env.VITE_BROWSER_PREVIEW_ACCESS_EMAIL?.trim().toLowerCase();
const REVENUECAT_RETRY_MS = 15_000;
const PURCHASES_OPERATION_TIMEOUT_MS = 12_000;
const OFFERINGS_REQUEST_TIMEOUT_MS = 6_000;
const OFFERINGS_RETRY_DELAY_MS = 400;
const STOREKIT_PRODUCT_CONFIGS: FallbackStoreProductConfig[] = [
  { packageIdentifier: "$rc_annual", productIdentifier: "ascendr.pro.annual" },
  { packageIdentifier: "$rc_monthly", productIdentifier: "ascendr.pro.monthly" },
  { packageIdentifier: "$rc_weekly", productIdentifier: "ascendr.pro.weekly" },
];

const listeners = new Set<() => void>();
let subscription = EMPTY_SUBSCRIPTION;
let packagesByPlan: Partial<Record<Plan, PurchasesPackage>> = {};
let storeProductsByPlan: Partial<Record<Plan, PurchasesStoreProduct>> = {};
let configured = false;
let configuredUserId: string | null = null;
let configureQueue: Promise<void> = Promise.resolve();
type PurchasesClient = typeof Purchases;

interface FallbackStoreProductConfig {
  packageIdentifier: string;
  productIdentifier: string;
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

async function getPurchases() {
  return Purchases;
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
  if (yearlyPrice >= annualMonthlyCost) return null;

  return Math.round((1 - yearlyPrice / annualMonthlyCost) * 100);
}

function createPlanPrice(plan: Plan, yearlyDiscount: number | null): PlanPrice {
  return {
    ...PLAN_PRICES[plan],
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
    availablePlans[plan] = true;
  }

  const yearlyDiscount = calculateYearlyDiscount(nextPackages.yearly, nextPackages.monthly);
  for (const plan of PLAN_ORDER) {
    if (nextPackages[plan]) prices[plan] = createPlanPrice(plan, yearlyDiscount);
  }

  packagesByPlan = nextPackages;
  storeProductsByPlan = {};
  updateSubscription({
    availablePlans,
    prices,
    ready: true,
    error:
      availablePackages.length === 0 && !subscription.active
        ? "Subscriptions are not available yet. Please try again later."
        : null,
  });

  return PLAN_ORDER.some((plan) => availablePlans[plan]);
}

function hasAvailablePlans() {
  return PLAN_ORDER.some((plan) => subscription.availablePlans[plan]);
}

function applyStoreProducts(nextProducts: Partial<Record<Plan, PurchasesStoreProduct>>) {
  const availablePlans = { ...EMPTY_AVAILABLE_PLANS };
  for (const plan of PLAN_ORDER) {
    availablePlans[plan] = Boolean(nextProducts[plan]);
  }

  packagesByPlan = {};
  storeProductsByPlan = nextProducts;
  updateSubscription({
    availablePlans,
    prices: { ...PLAN_PRICES },
    ready: true,
    error: PLAN_ORDER.some((plan) => availablePlans[plan])
      ? null
      : "Subscriptions are not available yet. Please try again later.",
  });
}

function setupErrorMessage(apiKey: string | null) {
  if (!isNativePlatform()) return "Purchases are available in the Ascendr iOS app.";
  if (!apiKey) return "RevenueCat checkout could not be configured. Please try again.";
  return null;
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

function getRevenueCatApiKey() {
  return BUNDLED_REVENUECAT_API_KEY || null;
}

function waitFor(delayMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs));
}

async function loadOfferings(purchases: PurchasesClient) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await withTimeout(
        purchases.getOfferings(),
        OFFERINGS_REQUEST_TIMEOUT_MS,
        "App Store prices timed out.",
      );
    } catch (error) {
      lastError = error;
      if (attempt === 0) await waitFor(OFFERINGS_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function loadStoreProducts(
  purchases: PurchasesClient,
  storeProductConfigs: FallbackStoreProductConfig[],
) {
  const plansByProductIdentifier = new Map<string, Plan>();
  for (const config of storeProductConfigs) {
    const plan =
      planFromIdentifier(config.packageIdentifier) ?? planFromIdentifier(config.productIdentifier);
    if (plan) plansByProductIdentifier.set(config.productIdentifier, plan);
  }
  if (plansByProductIdentifier.size === 0) return false;

  const { products } = await withTimeout(
    purchases.getProducts({ productIdentifiers: [...plansByProductIdentifier.keys()] }),
    OFFERINGS_REQUEST_TIMEOUT_MS,
    "App Store products timed out.",
  );
  const nextProducts: Partial<Record<Plan, PurchasesStoreProduct>> = {};
  for (const product of products) {
    const plan = plansByProductIdentifier.get(product.identifier);
    if (plan && !nextProducts[plan]) nextProducts[plan] = product;
  }
  if (Object.keys(nextProducts).length === 0) return false;

  applyStoreProducts(nextProducts);
  return true;
}

async function refreshRevenueCatState(forceRefresh = false) {
  const purchases = await getPurchases();
  if (forceRefresh) await purchases.invalidateCustomerInfoCache();
  const loadedStoreProducts = await loadStoreProducts(purchases, STOREKIT_PRODUCT_CONFIGS).catch(
    () => false,
  );

  if (!loadedStoreProducts) {
    const offerings = await loadOfferings(purchases);
    const loadedPackages = applyOfferings(offerings.current?.availablePackages ?? []);
    if (!loadedPackages) throw new Error("No App Store products were returned.");
  }

  try {
    const { customerInfo } = await withTimeout(
      purchases.getCustomerInfo(),
      PURCHASES_OPERATION_TIMEOUT_MS,
      "RevenueCat subscription check timed out.",
    );
    applyCustomerInfo(customerInfo);
  } catch (error) {
    console.warn("[revenuecat] Could not refresh customer information", error);
    updateSubscription({
      active: false,
      plan: null,
      since: null,
      expiresAt: null,
      renewalRequired: false,
      ready: true,
      error: null,
    });
  }
}

async function syncRevenueCatUser(userId: string | null, email: string | null) {
  try {
    if (hasBrowserPreviewAccess(email)) {
      publish({
        ...EMPTY_SUBSCRIPTION,
        active: true,
        plan: "yearly",
        since: new Date().toISOString(),
        expiresAt: null,
        ready: true,
      });
      return;
    }

    const apiKey = await getRevenueCatApiKey();
    const setupError = setupErrorMessage(apiKey);
    if (setupError) {
      publish({ ...EMPTY_SUBSCRIPTION, ready: true, error: setupError });
      return;
    }
    if (!apiKey) return;

    const purchases = await withTimeout(
      getPurchases(),
      PURCHASES_OPERATION_TIMEOUT_MS,
      "RevenueCat checkout could not be loaded.",
    );

    if (!configured) {
      if (import.meta.env.DEV) await purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await withTimeout(
        purchases.configure(userId ? { apiKey, appUserID: userId } : { apiKey }),
        PURCHASES_OPERATION_TIMEOUT_MS,
        "RevenueCat setup timed out.",
      );
      configured = true;
      configuredUserId = userId;
      void purchases.addCustomerInfoUpdateListener(applyCustomerInfo).catch((error: unknown) => {
        console.warn("[revenuecat] Customer update listener is unavailable", error);
      });
    } else if (userId && configuredUserId !== userId) {
      packagesByPlan = {};
      storeProductsByPlan = {};
      publish({ ...EMPTY_SUBSCRIPTION, ready: false, error: null });
      const result = await withTimeout(
        purchases.logIn({ appUserID: userId }),
        PURCHASES_OPERATION_TIMEOUT_MS,
        "RevenueCat account sync timed out.",
      );
      configuredUserId = userId;
      applyCustomerInfo(result.customerInfo);
    } else if (!userId && configuredUserId) {
      packagesByPlan = {};
      storeProductsByPlan = {};
      publish({ ...EMPTY_SUBSCRIPTION, ready: false, error: null });
      const result = await withTimeout(
        purchases.logOut(),
        PURCHASES_OPERATION_TIMEOUT_MS,
        "RevenueCat sign-out timed out.",
      );
      configuredUserId = null;
      applyCustomerInfo(result.customerInfo);
    }

    if (userId && email) {
      void withTimeout(
        purchases.setEmail({ email }),
        PURCHASES_OPERATION_TIMEOUT_MS,
        "RevenueCat account sync timed out.",
      ).catch((error: unknown) => {
        console.warn("[revenuecat] Could not sync subscriber email", error);
      });
    }
    await refreshRevenueCatState();
  } catch (error) {
    console.error("[revenuecat] Could not load subscription state", error);
    publish({
      ...subscription,
      active: false,
      plan: null,
      since: null,
      expiresAt: null,
      renewalRequired: false,
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

    const synchronize = () => {
      configureQueue = configureQueue
        .catch(() => undefined)
        .then(() => syncRevenueCatUser(userId, email));
    };

    synchronize();
    if (!isNativePlatform()) return;

    const retryId = window.setInterval(() => {
      if (!configured || (!subscription.active && !hasAvailablePlans())) synchronize();
    }, REVENUECAT_RETRY_MS);

    return () => window.clearInterval(retryId);
  }, [email, session, userId]);

  useEffect(() => {
    if (!userId || !isNativePlatform()) return;

    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      configureQueue = configureQueue
        .catch(() => undefined)
        .then(() =>
          configured && configuredUserId
            ? withTimeout(
                refreshRevenueCatState(true),
                PURCHASES_OPERATION_TIMEOUT_MS,
                "RevenueCat subscription refresh timed out.",
              )
            : undefined,
        )
        .catch((error) => {
          console.error("[revenuecat] Could not refresh subscription state", error);
          updateSubscription({
            active: false,
            plan: null,
            since: null,
            renewalRequired: false,
            ready: true,
            error: "We couldn't verify your subscription. Please try again.",
          });
        });
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
  if (!configured) {
    throw new Error(subscription.error ?? "Secure checkout is not ready yet.");
  }
}

export async function purchaseSubscription(plan: Plan): Promise<Subscription> {
  await requireConfiguredRevenueCat();
  const aPackage = packagesByPlan[plan];
  const storeProduct = storeProductsByPlan[plan];
  if (!aPackage && !storeProduct) {
    throw new Error("This subscription option is unavailable. Please try again later.");
  }

  const purchases = await getPurchases();
  const { customerInfo } = aPackage
    ? await purchases.purchasePackage({ aPackage })
    : await purchases.purchaseStoreProduct({ product: storeProduct! });
  applyCustomerInfo(customerInfo);
  return getSubscription();
}

export async function restorePurchases(): Promise<Subscription> {
  await requireConfiguredRevenueCat();
  const purchases = await getPurchases();
  const { customerInfo } = await purchases.restorePurchases();
  applyCustomerInfo(customerInfo);
  return getSubscription();
}

export function isPurchaseCancelled(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const purchaseError = error as { code?: unknown; userCancelled?: unknown };
  return purchaseError.userCancelled === true || purchaseError.code === "PURCHASE_CANCELLED_ERROR";
}
