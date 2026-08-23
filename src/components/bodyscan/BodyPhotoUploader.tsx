import { useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export interface PhotoSlotProps {
  label: string;
  required?: boolean;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  capture?: "user" | "environment";
  hint?: string;
  minDimension?: number;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function PhotoSlot({
  label,
  required,
  value,
  onChange,
  capture = "environment",
  hint = "Use a clear, unfiltered photo in even lighting.",
  minDimension = 480,
}: PhotoSlotProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const handle = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Ascendr scans use a still photo, not a video. Take or choose a photo.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("That photo is over 15 MB. Choose a smaller image.");
      return;
    }

    setReading(true);
    try {
      const url = await fileToDataURL(f);
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = reject;
        image.src = url;
      });
      if (Math.min(dimensions.width, dimensions.height) < minDimension) {
        toast.error(
          `Use a sharper photo that is at least ${minDimension} px on its shortest side.`,
        );
        return;
      }
      onChange(url);
    } catch {
      toast.error("Ascendr couldn't read that image. Try a JPEG, PNG, or WebP photo.");
    } finally {
      setReading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  return (
    <div className="rounded-[28px] border border-white/[0.07] bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {label}{" "}
          {required ? (
            <span className="text-neon text-[10px] ml-1 font-bold uppercase tracking-wider">
              Required
            </span>
          ) : (
            <span className="text-muted-foreground text-[10px] ml-1 uppercase tracking-wider">
              Optional
            </span>
          )}
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove photo"
            className="size-7 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {value ? (
        <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] bg-black ring-1 ring-neon/20">
          <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[9px] font-bold text-neon backdrop-blur">
            <CheckCircle2 className="size-3" /> Photo ready
          </div>
        </div>
      ) : (
        <div className="relative grid aspect-[3/4] place-items-center overflow-hidden rounded-[22px] border border-dashed border-white/15 bg-black/35 p-8 text-center">
          <div className="absolute left-4 top-4 size-7 border-l-2 border-t-2 border-neon/55" />
          <div className="absolute right-4 top-4 size-7 border-r-2 border-t-2 border-neon/55" />
          <div className="absolute bottom-4 left-4 size-7 border-b-2 border-l-2 border-neon/55" />
          <div className="absolute bottom-4 right-4 size-7 border-b-2 border-r-2 border-neon/55" />
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-neon">
              {reading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </div>
            <p className="mt-3 text-sm font-semibold">Add your photo</p>
            <p className="mx-auto mt-1 max-w-[24ch] text-[10px] leading-relaxed text-muted-foreground">
              {hint}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={reading}
          onClick={() => cameraRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
        >
          <Camera className="size-4" /> Take photo
        </button>
        <button
          type="button"
          disabled={reading}
          onClick={() => uploadRef.current?.click()}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
        >
          <Upload className="size-4" /> Upload
        </button>
        <input
          ref={cameraRef}
          aria-label="Take scan photo"
          type="file"
          accept="image/*"
          capture={capture}
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
        <input
          ref={uploadRef}
          aria-label="Upload scan photo"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </div>
      <p className="mt-2 text-center text-[9px] text-muted-foreground">
        Still photos only. Video recording is not used for AI scans.
      </p>
    </div>
  );
}
