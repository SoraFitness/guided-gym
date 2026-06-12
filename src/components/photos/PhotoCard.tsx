import { Link } from "@tanstack/react-router";
import type { ProgressPhotoRow } from "@/lib/progressPhotos.functions";
import { formatPhotoDate, typeLabel } from "@/components/photos/photoUtils";

export function PhotoCard({ photo }: { photo: ProgressPhotoRow }) {
  return (
    <Link
      to="/photos/$photoId"
      params={{ photoId: photo.id }}
      className="block rounded-2xl overflow-hidden bg-surface border border-border active:scale-[0.98] transition"
    >
      <div className="aspect-[3/4] bg-black relative">
        {photo.signed_url ? (
          <img
            src={photo.signed_url}
            alt={`${typeLabel(photo.photo_type)} progress on ${formatPhotoDate(photo.taken_on)}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            Image unavailable
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider font-bold bg-black/60 text-neon px-2 py-1 rounded-full">
          {typeLabel(photo.photo_type)}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">{formatPhotoDate(photo.taken_on)}</span>
          {photo.weight_kg !== null && (
            <span className="text-xs text-neon font-bold tabular-nums">{photo.weight_kg} kg</span>
          )}
        </div>
        {photo.notes && (
          <p className="text-[11px] text-muted-foreground line-clamp-1">{photo.notes}</p>
        )}
      </div>
    </Link>
  );
}
