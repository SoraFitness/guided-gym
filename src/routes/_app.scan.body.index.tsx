import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Dumbbell,
  Loader2,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ScanHistoryList } from "@/components/scans/ScanHistoryList";
import { useAuthSession } from "@/lib/authSession";
import { deleteScanSubmission, listScanSubmissions } from "@/lib/scanSubmissions.functions";

export const Route = createFileRoute("/_app/scan/body/")({
  head: () => ({ meta: [{ title: "Body Scan — Ascendr" }] }),
  component: BodyScanIntro,
});

function BodyScanIntro() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const listHistory = useServerFn(listScanSubmissions);
  const deleteSubmission = useServerFn(deleteScanSubmission);
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const historyQuery = useQuery({
    queryKey: [
      "scan-submissions",
      "body",
      session && session !== "loading" ? session.userId : "guest",
    ],
    queryFn: () => listHistory({ data: { scanType: "body" } }),
    enabled: Boolean(session && session !== "loading"),
  });

  async function removeScan(id: string) {
    setDeletingId(id);
    try {
      await deleteSubmission({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["scan-submissions", "body"] });
      toast.success("Body Scan deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete the scan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-12 pt-5">
      <header className="flex items-center gap-3">
        <Link
          to="/scan"
          className="grid size-10 place-items-center rounded-full border border-white/[0.06] bg-surface"
          aria-label="Back to scans"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.23em] text-neon">
            Ascendr Vision
          </p>
          <h1 className="text-lg font-bold">Body Scan</h1>
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mt-6 overflow-hidden rounded-[32px] border border-neon/15 bg-gradient-to-br from-neon/[0.12] via-surface to-black p-6"
      >
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-neon/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="relative flex items-center justify-between">
          <div className="grid size-14 place-items-center rounded-2xl bg-neon/15 text-neon">
            <ScanLine className="size-7" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-neon/20 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-neon">
            <Sparkles className="size-3" /> AI report
          </span>
        </div>
        <h2 className="relative mt-16 text-3xl font-bold leading-tight">
          Turn one photo into a clearer plan.
        </h2>
        <p className="relative mt-3 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">
          See visible muscularity, a broad body-fat range, proportions, potential, and nine distinct
          muscle groups—then get your highest-impact next steps.
        </p>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          {[
            { value: "9", label: "Muscle groups" },
            { value: "6", label: "Core metrics" },
            { value: "1", label: "Action plan" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-black/25 p-3">
              <p className="text-xl font-black text-neon">{item.value}</p>
              <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wider text-white/45">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      <button
        type="button"
        onClick={() => navigate({ to: "/scan/body/new" })}
        className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neon text-base font-bold text-neon-foreground shadow-[0_14px_40px_-14px_var(--neon)] transition active:scale-[0.985]"
      >
        <Sparkles className="size-5" /> Start Body Scan
      </button>

      <section className="mt-5 grid grid-cols-3 gap-2">
        {[
          { icon: Dumbbell, label: "Clear muscle groups" },
          { icon: Target, label: "Prioritized actions" },
          { icon: LockKeyhole, label: "Private by default" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center"
          >
            <Icon className="mx-auto size-4 text-neon" />
            <p className="mt-2 text-[9px] font-semibold leading-snug text-white/55">{label}</p>
          </div>
        ))}
      </section>

      {historyQuery.isLoading && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-3xl border border-white/[0.06] bg-surface py-8 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your private history
        </div>
      )}

      <ScanHistoryList
        items={historyQuery.data ?? []}
        label="Body"
        deletingId={deletingId}
        onOpen={(id) => navigate({ to: "/scan/body/$id", params: { id } })}
        onDelete={removeScan}
      />

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-neon" />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Photos and reports are stored in your private account. Results are photo-dependent visual
          opinions, not medical or body-composition measurements.
        </p>
      </div>
    </div>
  );
}
