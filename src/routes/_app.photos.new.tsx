import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/authSession";
import { createLocalProgressPhoto } from "@/lib/progressPhotos.local";
import { SoftAccountPrompt } from "@/components/SoftAccountPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProgressPhoto, type PhotoType } from "@/lib/progressPhotos.functions";
import { compressImage } from "@/lib/imageCompress";
import { createClientId } from "@/lib/clientId";
import { PHOTO_TYPES, todayIso, typeLabel } from "@/components/photos/photoUtils";

export const Route = createFileRoute("/_app/photos/new")({
  component: NewPhoto,
});

function NewPhoto() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>("front");
  const [date, setDate] = useState<string>(todayIso());
  const [weight, setWeight] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please pick an image");
      return;
    }
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function save() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const blob = await compressImage(file, 1600, 0.85);
      const weightNum = weight.trim() ? Number(weight.replace(",", ".")) : null;
      const weight_kg = Number.isFinite(weightNum) ? (weightNum as number) : null;

      if (session && session !== "loading") {
        const uuid = createClientId();
        const path = `${session.userId}/${uuid}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("progress-photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw new Error(upErr.message);

        await createProgressPhoto({
          data: {
            image_path: path,
            photo_type: photoType,
            taken_on: date,
            weight_kg,
            notes: notes.trim() ? notes.trim() : null,
          },
        });
      } else {
        await createLocalProgressPhoto({
          imageBlob: blob,
          photo_type: photoType,
          taken_on: date,
          weight_kg,
          notes: notes.trim() ? notes.trim() : null,
        });
      }
      toast.success("Progress photo saved");
      navigate({ to: "/photos" });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Couldn't save photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-6 pb-32 animate-slide-up max-w-md mx-auto">
      <header className="flex items-center gap-3">
        <Link
          to="/photos"
          className="size-10 rounded-full bg-surface grid place-items-center"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">Add Progress Photo</h1>
      </header>

      {session === null && (
        <div className="mt-5">
          <SoftAccountPrompt
            title="Save photos across devices"
            description="You can add photos now. They stay on this device until you create an account for cloud backup."
            redirectPath="/photos/new"
            storageKey="fitness:dismiss-photo-new-account-prompt"
          />
        </div>
      )}

      <div className="mt-5 rounded-3xl bg-surface border border-border p-4">
        <div className="aspect-[3/4] rounded-2xl bg-black overflow-hidden grid place-items-center relative">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground">
              <Camera className="size-10 mx-auto opacity-60" />
              <p className="text-xs mt-2">No photo selected</p>
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            ref={cameraRef}
            aria-label="Take a progress photo"
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <input
            ref={fileRef}
            aria-label="Choose a progress photo"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="h-12 rounded-full bg-neon text-neon-foreground hover:bg-neon/90"
          >
            <Camera className="size-4 mr-2" /> Camera
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="h-12 rounded-full border-border bg-surface-2"
          >
            <Upload className="size-4 mr-2" /> Gallery
          </Button>
        </div>
      </div>

      <section className="mt-5 space-y-4">
        <div>
          <Label>Photo type</Label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {PHOTO_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setPhotoType(t)}
                type="button"
                className={cn(
                  "h-11 rounded-2xl text-xs font-semibold border",
                  photoType === t
                    ? "bg-neon text-neon-foreground border-neon"
                    : "bg-surface border-border text-muted-foreground",
                )}
              >
                {typeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="progress-photo-date">Date</Label>
            <Input
              id="progress-photo-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 h-12 bg-surface border-border"
            />
          </div>
          <div>
            <Label htmlFor="progress-photo-weight">Weight (kg)</Label>
            <Input
              id="progress-photo-weight"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="mt-2 h-12 bg-surface border-border"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="progress-photo-notes">Notes (optional)</Label>
          <Textarea
            id="progress-photo-notes"
            placeholder="How are you feeling? Diet, training, mood…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 min-h-24 bg-surface border-border"
            maxLength={500}
          />
        </div>

        <Button
          onClick={save}
          disabled={!file || busy || session === "loading"}
          className="w-full h-14 rounded-full bg-neon text-neon-foreground hover:bg-neon/90 text-base font-bold"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            "Save Progress Photo"
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          {session
            ? "Your progress photos are private and only visible to you."
            : "Saved privately on this device."}
        </p>
      </section>
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  );
}
