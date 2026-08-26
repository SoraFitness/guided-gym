import { corsPreflightResponse, jsonResponse } from "../_shared/cors.ts";

interface RevenueCatPackage {
  identifier?: unknown;
  platform_product_identifier?: unknown;
}

interface RevenueCatOffering {
  identifier?: unknown;
  packages?: unknown;
}

interface RevenueCatOfferingsResponse {
  current_offering_id?: unknown;
  offerings?: unknown;
}

interface StoreProductConfig {
  packageIdentifier: string;
  productIdentifier: string;
}

async function getStoreProducts(): Promise<StoreProductConfig[]> {
  const secretApiKey = Deno.env.get("REVENUECAT_SECRET_API_KEY")?.trim();
  if (!secretApiKey) return [];

  try {
    const response = await fetch(
      "https://api.revenuecat.com/v1/subscribers/ascendr-storekit-fallback/offerings",
      {
        headers: { Authorization: `Bearer ${secretApiKey}` },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      console.error("[revenuecat-config] Could not load offerings", response.status);
      return [];
    }

    const payload = (await response.json()) as RevenueCatOfferingsResponse;
    const currentOfferingId =
      typeof payload.current_offering_id === "string" ? payload.current_offering_id : null;
    const currentOffering = Array.isArray(payload.offerings)
      ? (payload.offerings as RevenueCatOffering[]).find(
          (offering) => offering.identifier === currentOfferingId,
        )
      : undefined;
    if (!currentOffering || !Array.isArray(currentOffering.packages)) return [];

    return (currentOffering.packages as RevenueCatPackage[]).flatMap((aPackage) => {
      const packageIdentifier =
        typeof aPackage.identifier === "string" ? aPackage.identifier.trim() : "";
      const productIdentifier =
        typeof aPackage.platform_product_identifier === "string"
          ? aPackage.platform_product_identifier.trim()
          : "";
      return packageIdentifier && productIdentifier ? [{ packageIdentifier, productIdentifier }] : [];
    });
  } catch (error) {
    console.error("[revenuecat-config] Could not load offerings", error);
    return [];
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("REVENUECAT_IOS_API_KEY")?.trim();
  if (!apiKey?.startsWith("appl_")) {
    return jsonResponse({ error: "RevenueCat iOS configuration is unavailable" }, 503);
  }

  return jsonResponse({ apiKey, storeProducts: await getStoreProducts() });
});
