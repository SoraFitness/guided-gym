import { Capacitor } from "@capacitor/core";
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useAuthSession } from "@/lib/authSession";
import { subscriptionStatusFromEntitlement } from "@/lib/subscriptionState";
import { trackTikTokSubscription, trackTikTokTrialStarted } from "@/lib/tiktokEvents";

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
  customerUserId: string | null;
  active: boolean;
  plan: Plan | null;
  since: string | null;
  expiresAt: string | null;
  willRenew: boolean | null;
  renewalRequired: boolean;
  billingIssue: boolean;
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
  customerUserId: null,
  active: false,
  plan: null,
  since: null,
  expiresAt: null,
  willRenew: null,
  renewalRequired: false,
  billingIssue: false,
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
// True once RevenueCat has told us whether this member is entitled.
let entitlementKnown = false;
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

/**
 * Only report a subscription TikTok could plausibly have driven. Without this, the first
 * launch after shipping TikTok would replay every existing member's long-past purchase as
 * a fresh conversion. A renewal that lands inside the window is still deduplicated
 * natively, because the key below is tied to the original purchase, not the latest one.
 */
const TIKTOK_PURCHASE_WINDOW_MS = 30 * 60 * 1000;

function isRecent(isoDate: string | null | undefined, now = Date.now()) {
  if (!isoDate) return false;
  const parsed = Date.parse(isoDate);
  return !Number.isNaN(parsed) && now - parsed <= TIKTOK_PURCHASE_WINDOW_MS && parsed <= now;
}

/**
 * Reports StartTrial / Subscribe+Purchase to TikTok from the one place every RevenueCat
 * update flows through. The native layer deduplicates, so repeated calls for the same
 * subscription report at most once. RevenueCat behaviour is untouched: this only reads.
 */
function reportTikTokConversion(entitlement: PurchasesEntitlementInfo | undefined) {
  if (!entitlement?.isActive || !isNativePlatform()) return;
  if (!isRecent(entitlement.latestPurchaseDate)) return;

  // Tied to the original purchase so renewals never re-report as new conversions.
  const dedupeKey = `${entitlement.productIdentifier}:${entitlement.originalPurchaseDate}`;
  const plan = planFromProductIdentifier(entitlement.productIdentifier);
  const product = plan ? packagesByPlan[plan]?.product : undefined;

  // An introductory offer is a trial start, not revenue; anything else is a paid period.
  const periodType = entitlement.periodType?.toUpperCase();
  if (periodType === "TRIAL" || periodType === "INTRO") {
    void trackTikTokTrialStarted({
      dedupeKey,
      productId: entitlement.productIdentifier,
      value: product?.price,
      currency: product?.currencyCode,
    });
    return;
  }

  void trackTikTokSubscription({
    dedupeKey,
    productId: entitlement.productIdentifier,
    value: product?.price,
    currency: product?.currencyCode,
  });
}

function applyCustomerInfo(customerInfo: CustomerInfo) {
  const entitlement = customerInfo.entitlements.all[ENTITLEMENT_ID];
  const status = subscriptionStatusFromEntitlement(entitlement);
  entitlementKnown = true;

  reportTikTokConversion(entitlement);

  updateSubscription({
    ...status,
    customerUserId: configuredUserId,
    plan:
      entitlement && status.active
        ? planFromProductIdentifier(entitlement.productIdentifier)
        : null,
    since: entitlement && status.active ? entitlement.latestPurchaseDate : null,
    ready: true,
  });
}

export function getSubscriptionDaysRemaining(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt) return null;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return null;
  return Math.max(0, Math.ceil((expiresAtMs - now) / (24 * 60 * 60 * 1000)));
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
  // Prices alone don't open the app: `ready` waits for the entitlement check.
  updateSubscription({
    availablePlans,
    prices,
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
  // The entitlement check runs alongside the offerings download instead of
  // after it, so members reach the app as soon as their subscription is known.
  const customerInfoTask = withTimeout(
    Purchases.getCustomerInfo(),
    PURCHASES_OPERATION_TIMEOUT_MS,
    "RevenueCat subscription check timed out.",
  ).then(
    ({ customerInfo }) => {
      applyCustomerInfo(customerInfo);
      return true;
    },
    (error: unknown) => {
      console.warn("[revenuecat] Could not refresh customer information", error);
      return false;
    },
  );

  try {
    const offerings = await loadCurrentOffering();
    applyOfferings(offerings.current?.availablePackages ?? []);
  } finally {
    // The entitlement may be unknown, but the app must never wait forever.
    if (!(await customerInfoTask)) updateSubscription({ ready: true });
  }
}

async function syncRevenueCatUser(userId: string | null, email: string | null) {
  if (hasBrowserPreviewAccess(email)) {
    publish({
      ...EMPTY_SUBSCRIPTION,
      customerUserId: userId,
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
      customerUserId: userId,
      ready: true,
      error: "Purchases are available in the Ascendr iOS app.",
    });
    return;
  }

  if (!REVENUECAT_API_KEY?.startsWith("appl_")) {
    publish({
      ...EMPTY_SUBSCRIPTION,
      customerUserId: userId,
      ready: true,
      error: CHECKOUT_CONFIGURATION_ERROR,
    });
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
      entitlementKnown = false;
      publish({ ...EMPTY_SUBSCRIPTION, customerUserId: userId, ready: false, error: null });
      const result = await Purchases.logIn({ appUserID: userId });
      configuredUserId = userId;
      applyCustomerInfo(result.customerInfo);
    } else if (!userId && configuredUserId) {
      packagesByPlan = {};
      entitlementKnown = false;
      publish({ ...EMPTY_SUBSCRIPTION, customerUserId: null, ready: false, error: null });
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
      customerUserId: userId,
      // A confirmed entitlement stands: only checkout is unavailable here.
      ...(entitlementKnown
        ? {}
        : {
            active: false,
            plan: null,
            since: null,
            expiresAt: null,
            renewalRequired: false,
            billingIssue: false,
          }),
      ready: true,
      error: CHECKOUT_OFFERING_ERROR,
    });
  }
}

export async function identifyRevenueCatUser(userId: string, email: string | null) {
  configureQueue = configureQueue
    .catch(() => undefined)
    .then(() => syncRevenueCatUser(userId, email));
  await configureQueue;
  return getSubscription();
}

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const userId = session && session !== "loading" ? session.userId : null;
  const email = session && session !== "loading" ? session.email : null;

  useEffect(() => {
    if (session === "loading") return;

    const synchronize = () => {
      if (userId) {
        void identifyRevenueCatUser(userId, email);
        return;
      }

      configureQueue = configureQueue
        .catch(() => undefined)
        .then(() => syncRevenueCatUser(null, null));
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
