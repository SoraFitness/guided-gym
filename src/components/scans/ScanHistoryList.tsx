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

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neon">
            Private history
          </p>
          <h2 className="mt-1 text-xl font-bold">Previous {label} scans</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{items.length} saved</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-[22px] border border-white/[0.07] bg-surface/85 p-3"
          >
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-black">
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt="Saved scan"
                    className="h-full w-full object-cover object-top opacity-75"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-neon">
                    <ScanLine className="size-5" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <span className="absolute bottom-1.5 left-2 text-lg font-black text-white">
                  {item.overallScore}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-neon">
                  {index === 0 ? "Latest report" : "Completed report"}
                </p>
                <p className="mt-1 line-clamp-1 text-sm font-semibold">{item.overallSummary}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock3 className="size-3" /> {formatDate(item.analyzedAt ?? item.createdAt)}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-white/30 transition group-hover:text-neon" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deletingId === item.id}
                  className="grid size-9 shrink-0 place-items-center rounded-full text-white/30 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
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
