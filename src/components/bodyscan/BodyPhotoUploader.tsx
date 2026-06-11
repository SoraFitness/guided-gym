import { useRef } from "react";
import { Camera, Upload, X } from "lucide-react";

export interface PhotoSlotProps {
  label: string;
  required?: boolean;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function PhotoSlot({ label, required, value, onChange }: PhotoSlotProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handle = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    const url = await fileToDataURL(f);
    onChange(url);
  };

  return (
    <div className="rounded-3xl bg-surface border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
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
            onClick={() => onChange(null)}
            aria-label="Remove photo"
            className="size-7 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 transition"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {value ? (
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black">
          <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[3/4] rounded-2xl border border-dashed border-white/10 bg-black/30 grid place-items-center">
          <p className="text-xs text-muted-foreground">No photo yet</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => cameraRef.current?.click()}
          className="h-11 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-medium transition"
        >
          <Camera className="size-4" /> Camera
        </button>
        <button
          onClick={() => uploadRef.current?.click()}
          className="h-11 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-sm font-medium transition"
        >
          <Upload className="size-4" /> Upload
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
