import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isAccountSession, useAuthSession } from "@/lib/authSession";
import { listScanSubmissions, type ScanSubmissionSummary } from "@/lib/scanSubmissions.functions";

/** A member's completed scans, newest first. Shares its cache with the scan pages. */
export function useScanHistory(scanType: "body" | "face") {
  const session = useAuthSession();
  const accountSession = isAccountSession(session) ? session : null;
  const list = useServerFn(listScanSubmissions);
  return useQuery({
    queryKey: ["scan-submissions", scanType, accountSession?.userId ?? "guest"],
    queryFn: () => list({ data: { scanType } }),
    enabled: Boolean(accountSession),
    staleTime: 60_000,
  });
}

/** Trend points ending at the given scan, so an older report never shows later scans. */
export function scanTrendUpTo(items: ScanSubmissionSummary[] | undefined, scanId: string) {
  const index = (items ?? []).findIndex((item) => item.id === scanId);
  return index < 0 ? [] : scanTrendPoints(items!.slice(index));
}

/** Oldest-first points for a trend chart. */
export function scanTrendPoints(items: ScanSubmissionSummary[] | undefined, limit = 8) {
  return [...(items ?? [])]
    .slice(0, limit)
    .reverse()
    .map((item) => ({
      label: new Date(item.analyzedAt ?? item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: item.overallScore,
    }));
}
