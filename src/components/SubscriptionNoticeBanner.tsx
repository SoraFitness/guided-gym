import { AlertTriangle, ExternalLink } from "lucide-react";
import { APPLE_SUBSCRIPTIONS_URL, type SubscriptionNotice } from "@/lib/subscriptionState";

export function SubscriptionNoticeBanner({ notice }: { notice: SubscriptionNotice }) {
  const title =
    notice.kind === "billing"
      ? "There's a problem with your payment"
      : notice.daysRemaining === 0
        ? "Your Ascendr Pro ends today"
        : `Your Ascendr Pro ends in ${notice.daysRemaining} ${notice.daysRemaining === 1 ? "day" : "days"}`;
  const body =
    notice.kind === "billing"
      ? "Apple couldn't renew your membership. Update your payment method to keep your plan, scans, and Coach."
      : "Auto-renew is off. Turn it back on in your App Store subscriptions to keep full access. Your progress stays saved either way.";

  return (
    <a
      href={APPLE_SUBSCRIPTIONS_URL}
      target="_blank"
      rel="noreferrer"
      className="mx-4 mt-3 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-3.5 sm:mx-5"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-amber-100">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-amber-100/75">{body}</span>
      </span>
      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-amber-200/70" />
    </a>
  );
}
