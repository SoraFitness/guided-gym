import { createMiddleware } from "@tanstack/react-start";
import { requireActiveSubscription } from "@/lib/subscription-access.server";

const BROWSER_PREVIEW_ACCESS_USER_ID = import.meta.env.VITE_BROWSER_PREVIEW_ACCESS_USER_ID?.trim();

export const requireActiveSubscriptionMiddleware = createMiddleware({ type: "function" }).server(
  async ({ context, next }) => {
    const userId = (context as unknown as { userId?: unknown }).userId;
    if (typeof userId !== "string" || !userId) throw new Error("Unauthorized");

    if (import.meta.env.DEV && userId === BROWSER_PREVIEW_ACCESS_USER_ID) return next();

    const accessToken = (context as unknown as { accessToken?: unknown }).accessToken;
    if (typeof accessToken !== "string" || !accessToken) throw new Error("Unauthorized");
    await requireActiveSubscription(accessToken);
    return next();
  },
);
