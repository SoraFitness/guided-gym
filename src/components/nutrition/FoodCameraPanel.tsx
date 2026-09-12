import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Sparkles, Upload, Zap, ZapOff } from "lucide-react";
import { cn } from "@/lib/utils";

type CameraState = "starting" | "live" | "unavailable";

/**
 * In-app camera for meal photos: a live viewfinder with a shutter, so logging a
 * meal feels like a camera app instead of a file picker. Falls back to the
 * gallery picker whenever a camera isn't available (desktop, denied permission).
 */
export function FoodCameraPanel({
  onFile,
  onGalleryClick,
}: {
  onFile: (file: File) => void;
  onGalleryClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let active = true;

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as { torch?: boolean } | undefined;
        setTorchSupported(Boolean(capabilities?.torch));
        setState("live");
      } catch {
        if (active) setState("unavailable");
      }
    };

    void start();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // `torch` is a real constraint on phones but isn't in the DOM typings yet.
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  const shoot = useCallback(() => {
    const video = videoRef.current;
    if (!video || capturing) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCapturing(false);
      return;
    }
    context.drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;
        navigator.vibrate?.(30);
        onFile(new File([blob], "meal.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }, [capturing, onFile]);

  if (state === "unavailable") {
    return (
      <div>
        <button
          onClick={onGalleryClick}
          className="grid aspect-[3/4] w-full place-items-center rounded-[28px] border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center active:scale-[0.99]"
        >
          <div>
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-neon/15">
              <Upload className="size-6 text-neon" />
            </div>
            <p className="text-sm font-semibold">Choose a meal photo</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Your camera isn't available here — pick a photo and we'll scan it
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] border border-white/[0.08] bg-black">
      <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,oklch(0_0_0/0.72)_100%)]" />

      {[
        "left-5 top-5 border-l-2 border-t-2",
        "right-5 top-5 border-r-2 border-t-2",
        "bottom-28 left-5 border-b-2 border-l-2",
        "bottom-28 right-5 border-b-2 border-r-2",
      ].map((position) => (
        <span
          key={position}
          className={cn("pointer-events-none absolute size-11 rounded-lg border-neon", position)}
        />
      ))}

      <div className="absolute inset-x-0 top-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
          <Sparkles className="size-3.5 text-neon" /> Just snap a pic
        </span>
      </div>

      {state === "starting" && (
        <div className="absolute inset-0 grid place-items-center bg-black/60">
          <div className="text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-neon" />
            <p className="mt-2 text-[11px] text-muted-foreground">Starting camera…</p>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 pb-5 pt-8">
        <p className="mb-3 text-center text-[10px] text-white/60">
          Shoot from above with the whole plate in frame
        </p>
        <div className="flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={onGalleryClick}
            aria-label="Choose from gallery"
            className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-black/50 backdrop-blur active:scale-95"
          >
            <ImageIcon className="size-5" />
          </button>

          <button
            type="button"
            onClick={shoot}
            disabled={state !== "live" || capturing}
            aria-label="Take photo"
            className="grid size-[74px] place-items-center rounded-full bg-white/95 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] transition active:scale-95 disabled:opacity-50"
          >
            <span className="size-[62px] rounded-full border-4 border-black/15 bg-white" />
          </button>

          <button
            type="button"
            onClick={() => void toggleTorch()}
            disabled={!torchSupported}
            aria-label={torchOn ? "Turn flash off" : "Turn flash on"}
            className={cn(
              "grid size-12 place-items-center rounded-2xl border backdrop-blur transition active:scale-95",
              torchOn
                ? "border-neon/40 bg-neon/20 text-neon"
                : "border-white/10 bg-black/50 text-white",
              !torchSupported && "opacity-30",
            )}
          >
            {torchOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
