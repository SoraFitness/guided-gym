import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Plus, ChevronRight } from "lucide-react";
import { listProgressPhotos, type ProgressPhotoRow } from "@/lib/progressPhotos.functions";
import {
  listLocalProgressPhotos,
  syncLocalProgressPhotosToCloud,
} from "@/lib/progressPhotos.local";
import { useAuthSession } from "@/lib/authSession";
import { formatPhotoDate } from "@/components/photos/photoUtils";

export function ProgressPicturesCard() {
  const session = useAuthSession();
  const [photos, setPhotos] = useState<ProgressPhotoRow[] | null>(null);

  useEffect(() => {
    if (session === "loading") return;
    let mounted = true;

    if (!session) {
      setPhotos(listLocalProgressPhotos());
      return () => {
        mounted = false;
      };
    }

    syncLocalProgressPhotosToCloud(session.userId)
      .then(() => listProgressPhotos())
      .then((p) => mounted && setPhotos(p))
      .catch(() => mounted && setPhotos([]));

    return () => {
      mounted = false;
    };
  }, [session]);

  const latest = photos?.[0];
  const count = photos?.length ?? 0;

  return (
    <section className="rounded-3xl bg-surface border border-border p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-neon" />
            <h2 className="font-bold">Progress Pictures</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Track your transformation over time</p>
        </div>
        <Link
          to="/photos/new"
          className="size-10 rounded-full bg-neon text-neon-foreground grid place-items-center shrink-0"
          aria-label="Add photo"
        >
          <Plus className="size-4" />
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Link
          to="/photos"
          className="size-20 rounded-2xl bg-black overflow-hidden border border-border shrink-0 grid place-items-center"
        >
          {latest?.signed_url ? (
            <img
              src={latest.signed_url}
              alt="Latest progress"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="size-6 text-muted-foreground" />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          {!session ? (
            <p className="text-sm text-muted-foreground">
              Saved on this device. Sign in later to sync.
            </p>
          ) : count === 0 ? (
            <p className="text-sm text-muted-foreground">
              No photos yet — add your first one to get started.
            </p>
          ) : (
            <>
              <div className="text-sm font-semibold">
                {count} photo{count === 1 ? "" : "s"} saved
              </div>
              {latest && (
                <div className="text-xs text-muted-foreground">
                  Latest: {formatPhotoDate(latest.taken_on)}
                </div>
              )}
            </>
          )}
        </div>
        <Link
          to="/photos"
          className="h-9 px-3 rounded-full bg-surface-2 border border-border text-xs font-semibold flex items-center gap-1 shrink-0"
        >
          View <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
