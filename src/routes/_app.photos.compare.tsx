import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  GitCompareArrows,
  ChevronsLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  compareProgressPhotosAI,
  listProgressPhotos,
  type ProgressPhotoRow,
} from "@/lib/progressPhotos.functions";
import {
  daysBetween,
  formatPhotoDate,
  typeLabel,
} from "@/components/photos/photoUtils";

export const Route = createFileRoute("/_app/photos/compare")({
  component: ComparePage,
});

type Mode = "side" | "slider";

interface AiFeedback {
  summary: string;
  observations: string[];
  tips: string[];
}

function ComparePage() {
  const [photos, setPhotos] = useState<ProgressPhotoRow[] | null>(null);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("side");
  const [aiBusy, setAiBusy] = useState(false);
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);

  useEffect(() => {
    listProgressPhotos()
      .then((p) => {
        setPhotos(p);
        if (p.length >= 2) {
          setAfterId(p[0].id);
          setBeforeId(p[p.length - 1].id);
        }
      })
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't load photos");
        setPhotos([]);
      });
  }, []);

  const before = useMemo(
    () => photos?.find((p) => p.id === beforeId) ?? null,
    [photos, beforeId],
  );
  const after = useMemo(
    () => photos?.find((p) => p.id === afterId) ?? null,
    [photos, afterId],
  );

  async function runAI() {
    if (!before || !after || aiBusy) return;
    setAiBusy(true);
    setFeedback(null);
    try {
      const r = await compareProgressPhotosAI({
        data: { beforeId: before.id, afterId: after.id },
      });
      setFeedback(r);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "AI is unavailable";
      if (msg.includes("429")) toast.error("AI is busy — try again in a minute.");
      else if (msg.includes("402")) toast.error("Out of AI credits.");
      else toast.error("Couldn't generate feedback");
    } finally {
      setAiBusy(false);
    }
  }

  if (photos === null) {
    return (
      <div className="px-5 pt-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (photos.length < 2) {
    return (
      <div className="px-5 pt-6 animate-slide-up max-w-md mx-auto">
        <header className="flex items-center gap-3">
          <Link
            to="/photos"
            className="size-10 rounded-full bg-surface grid place-items-center"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold">Compare</h1>
        </header>
        <div className="mt-10 rounded-3xl bg-surface border border-border p-8 text-center">
          <GitCompareArrows className="size-10 mx-auto text-neon" />
          <p className="mt-4 font-bold">Need at least 2 photos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add another progress photo to start comparing.
          </p>
          <Link
            to="/photos/new"
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-neon text-neon-foreground font-semibold"
          >
            Add Photo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-12 animate-slide-up max-w-md mx-auto">
      <header className="flex items-center gap-3">
        <Link
          to="/photos"
          className="size-10 rounded-full bg-surface grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Compare</h1>
      </header>

      <p className="text-xs text-muted-foreground mt-2">
        Tip: compare the same pose &amp; angle (front vs front) for the most honest read.
      </p>

      <section className="mt-5 space-y-3">
        <PhotoPicker
          label="Before"
          photos={photos}
          selectedId={beforeId}
          onSelect={setBeforeId}
        />
        <PhotoPicker
          label="After"
          photos={photos}
          selectedId={afterId}
          onSelect={setAfterId}
        />
      </section>

      {before && after && before.id !== after.id && (
        <>
          <div className="mt-5 flex items-center gap-2">
            <ModeTab active={mode === "side"} onClick={() => setMode("side")}>
              Side by side
            </ModeTab>
            <ModeTab active={mode === "slider"} onClick={() => setMode("slider")}>
              <ChevronsLeftRight className="size-4" /> Swipe
            </ModeTab>
          </div>

          <div className="mt-4">
            {mode === "side" ? (
              <SideBySide before={before} after={after} />
            ) : (
              <SwipeSlider before={before} after={after} />
            )}
          </div>

          <Stats before={before} after={after} />

          <Button
            onClick={runAI}
            disabled={aiBusy}
            className="mt-5 w-full h-12 rounded-full bg-neon text-neon-foreground hover:bg-neon/90 font-semibold"
          >
            {aiBusy ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Analysing photos…
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" /> Get AI feedback
              </>
            )}
          </Button>

          {feedback && <FeedbackCard feedback={feedback} />}
        </>
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 border",
        active
          ? "bg-neon text-neon-foreground border-neon"
          : "bg-surface border-border text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function PhotoPicker({
  label,
  photos,
  selectedId,
  onSelect,
}: {
  label: string;
  photos: ProgressPhotoRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {photos.map((p) => {
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                "shrink-0 size-20 rounded-2xl overflow-hidden border-2 relative",
                active ? "border-neon" : "border-transparent",
              )}
            >
              {p.signed_url && (
                <img src={p.signed_url} alt="" className="w-full h-full object-cover" />
              )}
              <span className="absolute bottom-0.5 left-0.5 text-[9px] uppercase bg-black/60 text-white px-1 rounded">
                {p.photo_type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SideBySide({
  before,
  after,
}: {
  before: ProgressPhotoRow;
  after: ProgressPhotoRow;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "Before", p: before },
        { label: "After", p: after },
      ].map(({ label, p }) => (
        <div key={label} className="rounded-2xl overflow-hidden bg-surface border border-border">
          <div className="aspect-[3/4] bg-black">
            {p.signed_url && (
              <img src={p.signed_url} alt={label} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-neon font-bold">{label}</div>
            <div className="text-[11px] font-semibold">{formatPhotoDate(p.taken_on)}</div>
            {p.weight_kg !== null && (
              <div className="text-[11px] text-muted-foreground tabular-nums">{p.weight_kg} kg</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SwipeSlider({
  before,
  after,
}: {
  before: ProgressPhotoRow;
  after: ProgressPhotoRow;
}) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function setFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    setPos((x / rect.width) * 100);
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) setFromClientX(e.clientX);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black select-none touch-none"
    >
      {after.signed_url && (
        <img
          src={after.signed_url}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}
      {before.signed_url && (
        <img
          src={before.signed_url}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
        />
      )}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-neon shadow-[0_0_12px_var(--neon)]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-9 rounded-full bg-neon text-neon-foreground grid place-items-center">
          <ChevronsLeftRight className="size-4" />
        </div>
      </div>
      <span className="absolute top-2 left-2 text-[10px] uppercase font-bold bg-black/60 text-white px-2 py-1 rounded-full">
        Before
      </span>
      <span className="absolute top-2 right-2 text-[10px] uppercase font-bold bg-black/60 text-white px-2 py-1 rounded-full">
        After
      </span>
    </div>
  );
}

function Stats({
  before,
  after,
}: {
  before: ProgressPhotoRow;
  after: ProgressPhotoRow;
}) {
  const days = daysBetween(before.taken_on, after.taken_on);
  const weightDiff =
    before.weight_kg !== null && after.weight_kg !== null
      ? +(after.weight_kg - before.weight_kg).toFixed(1)
      : null;
  const sameType = before.photo_type === after.photo_type;
  return (
    <div className="mt-4 rounded-2xl bg-surface border border-border p-4 grid grid-cols-3 gap-3 text-center">
      <Stat label="Elapsed" value={`${Math.abs(days)} d`} />
      <Stat
        label="Weight"
        value={
          weightDiff === null ? "—" : `${weightDiff > 0 ? "+" : ""}${weightDiff} kg`
        }
        accent={weightDiff !== null}
      />
      <Stat
        label="Pose"
        value={sameType ? typeLabel(before.photo_type) : "Mixed"}
        warn={!sameType}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "text-base font-extrabold tabular-nums",
          accent && "text-neon",
          warn && "text-amber-400",
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function FeedbackCard({ feedback }: { feedback: AiFeedback }) {
  return (
    <div className="mt-5 rounded-3xl bg-gradient-to-br from-neon/15 to-surface border border-neon/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-neon" />
        <h3 className="font-bold text-sm">Coach feedback</h3>
      </div>
      <p className="text-sm leading-relaxed">{feedback.summary}</p>
      {feedback.observations.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            What I noticed
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {feedback.observations.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}
      {feedback.tips.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Tips
          </div>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {feedback.tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        AI feedback is general and not medical advice.
      </p>
    </div>
  );
}
