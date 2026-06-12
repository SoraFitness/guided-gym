import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, Plus, GitCompareArrows, ImageIcon, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { listProgressPhotos, type ProgressPhotoRow } from "@/lib/progressPhotos.functions";
import { PhotoCard } from "@/components/photos/PhotoCard";
import { formatPhotoDate } from "@/components/photos/photoUtils";

export const Route = createFileRoute("/_app/photos/")({
  component: PhotosIndex,
});

type View = "gallery" | "timeline";
type Group = "Week" | "Month" | "Year";

function PhotosIndex() {
  const [photos, setPhotos] = useState<ProgressPhotoRow[] | null>(null);
  const [view, setView] = useState<View>("gallery");
  const [group, setGroup] = useState<Group>("Month");

  useEffect(() => {
    listProgressPhotos()
      .then(setPhotos)
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't load photos");
        setPhotos([]);
      });
  }, []);

  const isEmpty = photos !== null && photos.length === 0;

  return (
    <div className="px-5 pt-6 pb-8 animate-slide-up">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-neon font-bold">Private</p>
          <h1 className="text-3xl font-bold mt-1">Progress Pictures</h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Lock className="size-3" /> Visible only to you
          </p>
        </div>
        <Link
          to="/photos/new"
          className="size-11 rounded-full bg-neon text-neon-foreground grid place-items-center shrink-0"
          aria-label="Add photo"
        >
          <Plus className="size-5" />
        </Link>
      </header>

      {photos === null ? (
        <div className="mt-12 flex justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <div className="mt-6 flex items-center gap-2">
            <ViewTab active={view === "gallery"} onClick={() => setView("gallery")}>
              <ImageIcon className="size-4" /> Gallery
            </ViewTab>
            <ViewTab active={view === "timeline"} onClick={() => setView("timeline")}>
              <Camera className="size-4" /> Timeline
            </ViewTab>
            <Link
              to="/photos/compare"
              className="ml-auto h-9 px-3 rounded-full bg-surface border border-border text-xs font-semibold flex items-center gap-1.5"
            >
              <GitCompareArrows className="size-4 text-neon" /> Compare
            </Link>
          </div>

          {view === "gallery" && <Gallery photos={photos!} />}
          {view === "timeline" && (
            <Timeline photos={photos!} group={group} onGroup={setGroup} />
          )}
        </>
      )}
    </div>
  );
}

function ViewTab({
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

function EmptyState() {
  return (
    <div className="mt-10 rounded-3xl bg-surface border border-border p-8 text-center">
      <div className="size-16 mx-auto rounded-2xl bg-neon/15 grid place-items-center text-neon">
        <Camera className="size-7" />
      </div>
      <h2 className="text-xl font-bold mt-4">Track your transformation</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        Upload your first progress photo to see changes over time.
      </p>
      <Link
        to="/photos/new"
        className="mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-neon text-neon-foreground font-semibold"
      >
        <Plus className="size-5" /> Add Progress Photo
      </Link>
      <p className="text-[11px] text-muted-foreground mt-4">
        Your progress photos are private and only visible to you.
      </p>
    </div>
  );
}

function Gallery({ photos }: { photos: ProgressPhotoRow[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      {photos.map((p) => (
        <PhotoCard key={p.id} photo={p} />
      ))}
    </div>
  );
}

function Timeline({
  photos,
  group,
  onGroup,
}: {
  photos: ProgressPhotoRow[];
  group: Group;
  onGroup: (g: Group) => void;
}) {
  const groups = useMemo(() => buildGroups(photos, group), [photos, group]);
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        {(["Week", "Month", "Year"] as Group[]).map((g) => (
          <button
            key={g}
            onClick={() => onGroup(g)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold border",
              g === group
                ? "bg-neon text-neon-foreground border-neon"
                : "bg-surface border-border text-muted-foreground",
            )}
          >
            {g}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-6">
        {groups.map(([label, items]) => (
          <section key={label}>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-bold">{label}</h3>
              <span className="text-[11px] text-muted-foreground">
                {items.length} photo{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((p) => (
                <Link
                  key={p.id}
                  to="/photos/$photoId"
                  params={{ photoId: p.id }}
                  className="aspect-square rounded-xl overflow-hidden bg-surface border border-border relative"
                >
                  {p.signed_url && (
                    <img
                      src={p.signed_url}
                      alt={formatPhotoDate(p.taken_on)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="absolute bottom-1 left-1 text-[9px] uppercase bg-black/60 text-neon px-1.5 py-0.5 rounded">
                    {p.photo_type}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function buildGroups(
  photos: ProgressPhotoRow[],
  group: Group,
): [string, ProgressPhotoRow[]][] {
  const map = new Map<string, ProgressPhotoRow[]>();
  for (const p of photos) {
    const key = groupKey(p.taken_on, group);
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function groupKey(iso: string, group: Group): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (group === "Year") return String(y);
  if (group === "Month")
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  // Week
  const week = startOfWeek(date);
  return `Week of ${week.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  const r = new Date(d);
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}
