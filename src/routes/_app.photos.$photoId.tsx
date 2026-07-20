import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/lib/authSession";
import {
  deleteLocalProgressPhoto,
  getLocalProgressPhoto,
  updateLocalProgressPhoto,
} from "@/lib/progressPhotos.local";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteProgressPhoto,
  getProgressPhoto,
  updateProgressPhoto,
  type PhotoType,
  type ProgressPhotoRow,
} from "@/lib/progressPhotos.functions";
import { PHOTO_TYPES, formatPhotoDate, typeLabel } from "@/components/photos/photoUtils";

export const Route = createFileRoute("/_app/photos/$photoId")({
  component: PhotoDetail,
});

function PhotoDetail() {
  const { photoId } = Route.useParams();
  const navigate = useNavigate();
  const session = useAuthSession();
  const [photo, setPhoto] = useState<ProgressPhotoRow | null | "loading">("loading");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (session === "loading") return;
    if (!session || photoId.startsWith("guest-")) {
      setPhoto(getLocalProgressPhoto(photoId));
      return;
    }

    getProgressPhoto({ data: { id: photoId } })
      .then((p) => setPhoto(p ?? null))
      .catch((e) => {
        console.error(e);
        toast.error("Couldn't load photo");
        setPhoto(null);
      });
  }, [photoId, session]);

  async function handleDelete() {
    try {
      if (!session || photoId.startsWith("guest-")) {
        deleteLocalProgressPhoto(photoId);
      } else {
        await deleteProgressPhoto({ data: { id: photoId } });
      }
      toast.success("Photo deleted");
      navigate({ to: "/photos" });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't delete photo");
    }
  }

  if (photo === "loading") {
    return (
      <div className="px-5 pt-12 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!photo) {
    return (
      <div className="px-5 pt-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Photo not found.</p>
        <Link to="/photos" className="text-sm text-neon underline">
          Back to gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-12 animate-slide-up max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <Link
          to="/photos"
          className="size-10 rounded-full bg-surface grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <button
          onClick={() => setConfirmDelete(true)}
          className="size-10 rounded-full bg-surface grid place-items-center text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="size-5" />
        </button>
      </header>

      <button
        onClick={() => setFullscreen(true)}
        className="mt-4 w-full rounded-3xl overflow-hidden bg-black aspect-[3/4] block"
      >
        {photo.signed_url && (
          <img src={photo.signed_url} alt="Progress" className="w-full h-full object-cover" />
        )}
      </button>

      {!editing ? (
        <ReadView photo={photo} onEdit={() => setEditing(true)} />
      ) : (
        <EditView
          photo={photo}
          cloud={!!session && !photo.id.startsWith("guest-")}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setPhoto({ ...photo, ...updated });
            setEditing(false);
          }}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this progress photo?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this progress photo? This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-5 right-5 size-10 rounded-full bg-white/10 grid place-items-center text-white"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          {photo.signed_url && (
            <img
              src={photo.signed_url}
              alt="Progress fullscreen"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReadView({ photo, onEdit }: { photo: ProgressPhotoRow; onEdit: () => void }) {
  return (
    <div className="mt-5 rounded-3xl bg-surface border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider font-bold bg-neon/15 text-neon px-2 py-1 rounded-full">
          {typeLabel(photo.photo_type)}
        </span>
        <button onClick={onEdit} className="text-xs font-semibold text-neon">
          Edit
        </button>
      </div>
      <Row label="Date" value={formatPhotoDate(photo.taken_on)} />
      <Row label="Weight" value={photo.weight_kg !== null ? `${photo.weight_kg} kg` : "—"} />
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Notes</div>
        <p className="mt-1 text-sm whitespace-pre-wrap">
          {photo.notes?.trim() ? (
            photo.notes
          ) : (
            <span className="text-muted-foreground">No notes.</span>
          )}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground text-[11px] uppercase tracking-wider">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function EditView({
  photo,
  cloud,
  onCancel,
  onSaved,
}: {
  photo: ProgressPhotoRow;
  cloud: boolean;
  onCancel: () => void;
  onSaved: (p: Partial<ProgressPhotoRow>) => void;
}) {
  const [photoType, setPhotoType] = useState<PhotoType>(photo.photo_type);
  const [date, setDate] = useState<string>(photo.taken_on);
  const [weight, setWeight] = useState<string>(
    photo.weight_kg !== null ? String(photo.weight_kg) : "",
  );
  const [notes, setNotes] = useState<string>(photo.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const weightNum = weight.trim() ? Number(weight.replace(",", ".")) : null;
      const weight_kg = Number.isFinite(weightNum) ? (weightNum as number) : null;
      const patch = {
        photo_type: photoType,
        taken_on: date,
        weight_kg,
        notes: notes.trim() ? notes.trim() : null,
      };
      if (cloud) {
        await updateProgressPhoto({
          data: {
            id: photo.id,
            ...patch,
          },
        });
      } else {
        updateLocalProgressPhoto({
          id: photo.id,
          ...patch,
        });
      }
      onSaved(patch);
      toast.success("Updated");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-3xl bg-surface border border-border p-5 space-y-4">
      <div>
        <Label>Photo type</Label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {PHOTO_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPhotoType(t)}
              className={cn(
                "h-10 rounded-xl text-xs font-semibold border",
                photoType === t
                  ? "bg-neon text-neon-foreground border-neon"
                  : "bg-surface-2 border-border text-muted-foreground",
              )}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 bg-surface-2 border-border"
          />
        </div>
        <div>
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-2 bg-surface-2 border-border"
          />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 min-h-24 bg-surface-2 border-border"
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-12 rounded-full border-border bg-surface-2"
        >
          Cancel
        </Button>
        <Button
          onClick={save}
          disabled={busy}
          className="flex-1 h-12 rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Check className="size-4 mr-1" /> Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{children}</span>
  );
}
