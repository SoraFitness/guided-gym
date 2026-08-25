import { createMiddleware } from "@tanstack/react-start";
import { requireActiveSubscription } from "@/lib/subscription-access.server";

export const requireActiveSubscriptionMiddleware = createMiddleware({ type: "function" }).server(
  async ({ context, next }) => {
    const userId = (context as unknown as { userId?: unknown }).userId;
    if (typeof userId !== "string" || !userId) throw new Error("Unauthorized");
    const accessToken = (context as unknown as { accessToken?: unknown }).accessToken;
    if (typeof accessToken !== "string" || !accessToken) throw new Error("Unauthorized");
    await requireActiveSubscription(accessToken);
    return next();
  },
);
