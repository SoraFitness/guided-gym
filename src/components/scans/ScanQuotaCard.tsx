import { CalendarClock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanQuotaStatus, ScanQuotaType } from "@/lib/scanQuota.functions";

interface ScanQuotaCardProps {
  scanType: ScanQuotaType;
  quota?: ScanQuotaStatus;
  loading?: boolean;
  signedIn: boolean;
}

export function ScanQuotaCard({ scanType, quota, loading, signedIn }: ScanQuotaCardProps) {
  const label = scanType === "face" ? "Face Scans" : "Body Scans";
  const limit = quota?.limit ?? 5;
  const used = quota?.used ?? 0;
  const remaining = quota?.remaining ?? limit;
  const limitReached = signedIn && quota?.allowed === false;

  return (
    <div
      className={cn(
        "mt-4 rounded-[22px] border p-4",
        limitReached
          ? "border-amber-400/25 bg-amber-400/[0.06]"
          : "border-white/[0.06] bg-white/[0.025]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={cn("size-4", limitReached ? "text-amber-300" : "text-neon")} />
          <p className="text-xs font-semibold">Weekly {label}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold",
            limitReached ? "bg-amber-400/10 text-amber-200" : "bg-neon/10 text-neon",
          )}
        >
          {!signedIn ? "5 per week" : loading ? "Checking..." : `${remaining} left`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5" aria-label={`${used} of ${limit} used`}>
        {Array.from({ length: limit }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 rounded-full",
              index < used ? (limitReached ? "bg-amber-300" : "bg-neon") : "bg-white/10",
            )}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
        <CalendarClock className="size-3.5 shrink-0" />
        <span>
          {signedIn
            ? limitReached
              ? "Limit reached. Your allowance resets Monday at 12:00 AM UTC."
              : `${used} of ${limit} used. Resets Monday at 12:00 AM UTC.`
            : "Sign in to view your remaining allowance."}
        </span>
      </div>
    </div>
  );
}
