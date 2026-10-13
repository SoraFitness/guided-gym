import { ChevronRight, Clock3, ScanLine, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ScanSubmissionSummary } from "@/lib/scanSubmissions.functions";
import { scoreColor, scoreTier } from "@/components/app/kit";
import { TrendChart } from "@/components/app/charts";
import { scanTrendPoints } from "./useScanHistory";

interface ScanHistoryListProps {
  items: ScanSubmissionSummary[];
  label: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  deletingId?: string | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ScanHistoryList({
  items,
  label,
  onOpen,
  onDelete,
  deletingId,
}: ScanHistoryListProps) {
  if (!items.length) return null;

  const trend = scanTrendPoints(items);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">Your {label} scans</h2>
        <span className="text-[13px] font-medium text-muted-foreground">{items.length} saved</span>
      </div>

      {trend.length >= 2 && (
        <div className="mb-3 rounded-[24px] border border-hairline bg-surface px-3 pb-3 pt-4">
          <TrendChart points={trend} height={130} />
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-[20px] border border-hairline bg-surface p-3"
          >
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              className="flex min-w-0 flex-1 items-center gap-3.5 text-left"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-[16px] bg-black">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt="Saved scan"
                    className="h-full w-full object-cover object-top opacity-80"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-neon">
                    <ScanLine className="size-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span
                    className="text-[24px] font-bold leading-none tabular-nums"
                    style={{ color: scoreColor(item.overallScore) }}
                  >
                    {item.overallScore}
                  </span>
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    {scoreTier(item.overallScore).label}
                  </span>
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Clock3 className="size-3.5" /> {formatDate(item.analyzedAt ?? item.createdAt)}
                  {index < items.length - 1 && (
                    <ScoreChange delta={item.overallScore - items[index + 1].overallScore} />
                  )}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                  aria-label="Delete scan"
                >
                  <Trash2 className="size-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[calc(100%_-_2.5rem)] max-w-md rounded-[28px] border-white/10 bg-background">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this {label} Scan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Its private photo and complete AI report will be permanently removed from your
                    account. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep scan</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(item.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreChange({ delta }: { delta: number }) {
  const tone =
    delta > 0
      ? "bg-score-high/12 text-score-high"
      : delta < 0
        ? "bg-score-low/12 text-score-low"
        : "bg-white/[0.06] text-muted-foreground";
  return (
    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      {delta > 0 ? `+${delta}` : delta < 0 ? delta : "No change"}
    </span>
  );
}
