import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode as BarcodeIcon, Image, Keyboard, Loader2, RefreshCw } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useServerFn } from "@tanstack/react-start";
import { lookupFoodByBarcode, type FoodSearchResult } from "@/lib/foodSearch.functions";
import type { LookupResult } from "@/lib/foodLookup";

type ScannerStatus =
  | "requesting"
  | "scanning"
  | "reading-image"
  | "looking-up"
  | "camera-error"
  | "invalid"
  | "not-found"
  | "lookup-error";

const SUPPORTED_FORMATS = [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_8,
  BarcodeFormat.EAN_13,
  BarcodeFormat.CODE_128,
  BarcodeFormat.ITF,
];

function createBarcodeReader() {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 500,
  });
}

function normalizeBarcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 14);
}

function toLookupResult(result: FoodSearchResult): LookupResult {
  return {
    name: result.name,
    brand: result.brand,
    imageUrl: result.imageUrl,
    serving: result.serving,
    kcal: result.kcal,
    protein: result.protein,
    carbs: result.carbs,
    fat: result.fat,
  };
}

export function BarcodeScannerPanel({ onResult }: { onResult: (result: LookupResult) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onResultRef = useRef(onResult);
  const lookup = useServerFn(lookupFoodByBarcode);
  const [status, setStatus] = useState<ScannerStatus>("requesting");
  const [message, setMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [detectedCode, setDetectedCode] = useState("");
  const [scanAttempt, setScanAttempt] = useState(0);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const resolveBarcode = useCallback(
    async (rawCode: string) => {
      const barcode = normalizeBarcode(rawCode);
      setDetectedCode(barcode);
      if (!/^\d{8,14}$/.test(barcode)) {
        setStatus("invalid");
        setMessage("Enter the 8–14 digit number printed beneath the barcode.");
        return;
      }

      setStatus("looking-up");
      setMessage("");
      try {
        const response = await lookup({ data: { barcode } });
        if (response.ok) {
          navigator.vibrate?.(40);
          onResultRef.current(toLookupResult(response.result));
          return;
        }
        if (response.reason === "not_found") {
          setStatus("not-found");
          setMessage(
            `We read ${barcode}, but that product is not in the database yet. You can enter it manually.`,
          );
          return;
        }
        setStatus(response.reason === "invalid_barcode" ? "invalid" : "lookup-error");
        setMessage(
          response.reason === "invalid_barcode"
            ? "That barcode number is incomplete. Check the digits and try again."
            : "The product database is temporarily unavailable. Try again in a moment.",
        );
      } catch (error) {
        console.error("[barcode lookup]", error);
        setStatus("lookup-error");
        setMessage("The product database is temporarily unavailable. Try again in a moment.");
      }
    },
    [lookup],
  );

  useEffect(() => {
    let active = true;
    let detected = false;
    let controls: IScannerControls | null = null;
    setStatus("requesting");
    setMessage("");

    if (!window.isSecureContext) {
      setStatus("camera-error");
      setMessage(
        "Live camera scanning needs a secure HTTPS link. You can still enter the digits or upload a barcode photo below.",
      );
      return () => {
        active = false;
      };
    }

    const reader = createBarcodeReader();

    void reader
      .decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current ?? undefined,
        (result) => {
          if (!active || detected || !result) return;
          detected = true;
          controls?.stop();
          controlsRef.current?.stop();
          void resolveBarcode(result.getText());
        },
      )
      .then((nextControls) => {
        controls = nextControls;
        controlsRef.current = nextControls;
        if (!active || detected) {
          nextControls.stop();
          return;
        }
        setStatus("scanning");
      })
      .catch((error: unknown) => {
        if (!active) return;
        const name = error instanceof DOMException ? error.name : "";
        setStatus("camera-error");
        setMessage(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera access is blocked. Allow camera access, enter the digits, or upload a barcode photo below."
            : name === "NotFoundError"
              ? "No camera was found. Enter the barcode digits or upload a photo below."
              : "The camera could not start. Enter the barcode digits or upload a photo below.",
        );
      });

    return () => {
      active = false;
      controls?.stop();
      if (controlsRef.current === controls) controlsRef.current = null;
    };
  }, [resolveBarcode, scanAttempt]);

  const retryCamera = () => {
    controlsRef.current?.stop();
    setScanAttempt((attempt) => attempt + 1);
  };

  const submitManual = (event: React.FormEvent) => {
    event.preventDefault();
    controlsRef.current?.stop();
    void resolveBarcode(manualCode);
  };

  const readBarcodeImage = async (file?: File) => {
    if (!file) return;
    controlsRef.current?.stop();
    setStatus("reading-image");
    setMessage("");
    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await createBarcodeReader().decodeFromImageUrl(imageUrl);
      await resolveBarcode(result.getText());
    } catch (error) {
      console.error("[barcode image]", error);
      setStatus("invalid");
      setMessage("No barcode was found in that photo. Try a sharper, closer image.");
    } finally {
      URL.revokeObjectURL(imageUrl);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const busy = status === "looking-up" || status === "reading-image";
  const showIssue = ["camera-error", "invalid", "not-found", "lookup-error"].includes(status);

  return (
    <div>
      <div className="aspect-[4/5] rounded-3xl bg-black/50 border border-white/[0.06] relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,oklch(0_0_0/0.76)_100%)] pointer-events-none" />
        {[
          "top-5 left-5 border-t-2 border-l-2",
          "top-5 right-5 border-t-2 border-r-2",
          "bottom-5 left-5 border-b-2 border-l-2",
          "bottom-5 right-5 border-b-2 border-r-2",
        ].map((position) => (
          <span
            key={position}
            className={`absolute w-10 h-10 border-neon rounded-md ${position}`}
          />
        ))}

        {(status === "requesting" || busy) && (
          <div className="absolute inset-0 grid place-items-center bg-black/45 p-6 text-center">
            <div>
              <Loader2 className="size-7 animate-spin text-neon mx-auto" />
              <p className="mt-3 text-sm font-medium">
                {status === "looking-up"
                  ? `Finding product ${detectedCode}…`
                  : status === "reading-image"
                    ? "Reading barcode photo…"
                    : "Starting camera…"}
              </p>
            </div>
          </div>
        )}

        {status === "scanning" && (
          <>
            <div className="absolute inset-x-10 top-1/2 h-px bg-neon shadow-[0_0_20px_var(--color-neon)] animate-[scan_2s_ease-in-out_infinite]" />
            <div className="absolute inset-x-0 bottom-6 text-center text-xs text-neon font-medium">
              Center the barcode and hold steady
            </div>
          </>
        )}

        {showIssue && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 p-7 text-center">
            <div>
              <BarcodeIcon className="size-8 text-neon mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">{message}</p>
              <button
                type="button"
                onClick={retryCamera}
                className="mt-4 h-10 px-4 rounded-full bg-neon text-neon-foreground text-xs font-semibold inline-flex items-center gap-2"
              >
                <RefreshCw className="size-3.5" /> Try camera again
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        Works with UPC, EAN, Code 128, and ITF product barcodes.
      </p>

      <div className="mt-4 grid gap-2">
        <form
          onSubmit={submitManual}
          className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-2"
        >
          <Keyboard className="ml-2 size-4 shrink-0 text-muted-foreground" />
          <input
            value={manualCode}
            onChange={(event) => setManualCode(normalizeBarcode(event.target.value))}
            inputMode="numeric"
            autoComplete="off"
            aria-label="Barcode number"
            placeholder="Enter barcode digits"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none tabular-nums"
          />
          <button
            type="submit"
            disabled={busy || !/^\d{8,14}$/.test(manualCode)}
            className="h-10 shrink-0 rounded-xl bg-neon px-4 text-xs font-semibold text-neon-foreground disabled:opacity-40"
          >
            Look up
          </button>
        </form>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void readBarcodeImage(event.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => imageInputRef.current?.click()}
          className="h-12 rounded-2xl border border-white/[0.06] bg-white/[0.04] text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Image className="size-4 text-neon" /> Upload a barcode photo
        </button>
      </div>

      <style>{`@keyframes scan { 0%,100% { transform: translateY(-100px); } 50% { transform: translateY(100px); } }`}</style>
    </div>
  );
}
