import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ImagePlus,
  Loader2,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { PhotoSlot } from "@/components/bodyscan/BodyPhotoUploader";
import { measureBodyHarmony, type BodyView } from "@/lib/harmony/body";
import { BODY_SIDE_STEPS, measureBodySide } from "@/lib/harmony/bodySide";
import { measureFrontHarmony } from "@/lib/harmony/faceFront";
import {
  SIDE_PROFILE_STEPS,
  measureSideHarmony,
  type SideProfilePoints,
} from "@/lib/harmony/faceSide";
import type { Point } from "@/lib/harmony/geometry";
import { detectBody, detectFrontFace, loadHarmonyImage } from "@/lib/harmony/landmarkers";
import type { HarmonyReport, HarmonySex } from "@/lib/harmony/scoring";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { GuidedPointTapper, type GuidedStep } from "./GuidedPointTapper";
import { HarmonyViewer, type HarmonyFrame } from "./HarmonyViewer";

interface Measured {
  report: HarmonyReport;
  frame: HarmonyFrame;
}

type MeasureState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | ({ status: "ready" } & Measured);

const LOAD_FAILURE = "Harmony couldn't start on this device. Check your connection and try again.";
const BODY_NOT_FOUND =
  "We couldn't find your full body in this photo. Harmony needs you visible from head to toe.";

const FACE_TABS = [
  { id: "front", label: "Front harmony" },
  { id: "side", label: "Side harmony" },
] as const;

const BODY_TABS = [
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "back", label: "Back" },
] as const;

function useHarmonyProfile() {
  const { profile } = useProfile();
  const sex: HarmonySex =
    profile?.gender === "male" || profile?.gender === "female" ? profile.gender : "neutral";
  const heightCm = profile?.heightCm && profile.heightCm > 0 ? profile.heightCm : null;
  return { sex, heightCm };
}

/** Detects landmarks on `photo` and measures them; `measure` must be stable. */
function useMeasuredPhoto(
  photo: string | null,
  measure: (image: HTMLImageElement) => Promise<Measured | null>,
  notFoundMessage: string,
): MeasureState {
  const [state, setState] = useState<MeasureState>({ status: photo ? "loading" : "idle" });

  useEffect(() => {
    if (!photo) {
      setState({ status: "idle" });
      return;
    }
    let active = true;
    setState({ status: "loading" });
    void (async () => {
      let release: (() => void) | undefined;
      try {
        const loaded = await loadHarmonyImage(photo);
        release = loaded.release;
        const measured = await measure(loaded.image);
        if (active) {
          setState(
            measured
              ? { status: "ready", ...measured }
              : { status: "error", message: notFoundMessage },
          );
        }
      } catch (error) {
        console.error("[harmony] measurement failed", error);
        if (active) setState({ status: "error", message: LOAD_FAILURE });
      } finally {
        release?.();
      }
    })();
    return () => {
      active = false;
    };
  }, [photo, measure, notFoundMessage]);

  return state;
}

async function measureBodyPhoto(
  image: HTMLImageElement,
  view: BodyView,
  heightCm: number | null,
): Promise<Measured | null> {
  const detected = await detectBody(image);
  return detected
    ? {
        report: measureBodyHarmony(detected.pose, detected.mask, { view, heightCm }),
        frame: detected.frame,
      }
    : null;
}

function SheetShell({
  title,
  onClose,
  tabs,
  children,
}: {
  title: string;
  onClose: () => void;
  tabs: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-[#070907] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="mx-auto max-w-md px-4 sm:px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
        }}
      >
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/[0.05] transition active:scale-95"
            aria-label="Close harmony"
          >
            <X className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neon">
              Ascendr harmony
            </p>
            <h2 className="text-sm font-bold">{title}</h2>
          </div>
          <span className="size-11" aria-hidden="true" />
        </header>
        {tabs}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className={cn(
        "mt-4 grid gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1",
        tabs.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "h-10 rounded-full text-[10px] font-black uppercase tracking-[0.14em] transition",
            active === tab.id ? "bg-white text-black" : "text-white/55",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Measuring({ label }: { label: string }) {
  return (
    <div className="grid min-h-[22rem] place-items-center rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6 text-center">
      <div>
        <Loader2 className="mx-auto size-7 animate-spin text-neon" />
        <p className="mt-4 text-sm font-semibold">{label}</p>
        <p className="mx-auto mt-1 max-w-[30ch] text-[11px] leading-relaxed text-white/45">
          Your photo stays on your device. The first time can take a few seconds while the measuring
          model loads.
        </p>
      </div>
    </div>
  );
}

function MeasureError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-amber-400/25 bg-amber-400/[0.07] p-4 text-[12px] leading-relaxed text-amber-100/90">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
      {message}
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] text-xs font-semibold"
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}

function MeasuredView({
  photo,
  state,
  heading,
  loadingLabel,
  toolbar,
}: {
  photo: string;
  state: MeasureState;
  heading: string;
  loadingLabel: string;
  toolbar?: ReactNode;
}) {
  if (state.status === "ready") {
    return (
      <HarmonyViewer
        photo={photo}
        frame={state.frame}
        report={state.report}
        heading={heading}
        toolbar={toolbar}
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-3">
        <MeasureError message={state.message} />
        {toolbar}
      </div>
    );
  }
  return <Measuring label={loadingLabel} />;
}

interface PhotoPrompt {
  title: string;
  body: string;
  photoLabel: string;
  hint: string;
}

function PhotoRequest({
  prompt,
  onPhoto,
}: {
  prompt: PhotoPrompt;
  onPhoto: (photo: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-4">
        <h3 className="text-sm font-bold">{prompt.title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-white/55">{prompt.body}</p>
      </div>
      <PhotoSlot
        label={prompt.photoLabel}
        required
        value={null}
        onChange={onPhoto}
        capture="environment"
        hint={prompt.hint}
      />
    </div>
  );
}

/** An uploaded photo measured automatically, such as a back photo. */
function UploadedPhotoFlow({
  prompt,
  heading,
  loadingLabel,
  newPhotoLabel,
  notFoundMessage,
  measure,
}: {
  prompt: PhotoPrompt;
  heading: string;
  loadingLabel: string;
  newPhotoLabel: string;
  notFoundMessage: string;
  measure: (image: HTMLImageElement) => Promise<Measured | null>;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const state = useMeasuredPhoto(photo, measure, notFoundMessage);
  if (!photo) return <PhotoRequest prompt={prompt} onPhoto={setPhoto} />;
  return (
    <MeasuredView
      photo={photo}
      state={state}
      heading={heading}
      loadingLabel={loadingLabel}
      toolbar={
        <ToolbarButton onClick={() => setPhoto(null)} icon={ImagePlus}>
          {newPhotoLabel}
        </ToolbarButton>
      }
    />
  );
}

/** An uploaded photo measured from points the member taps; `measure` must be stable. */
function GuidedPhotoFlow<Id extends string>({
  prompt,
  steps,
  guide,
  heading,
  newPhotoLabel,
  measure,
}: {
  prompt: PhotoPrompt;
  steps: readonly GuidedStep<Id>[];
  guide?: readonly [Id, Id];
  heading: string;
  newPhotoLabel: string;
  measure: (points: Record<Id, Point>) => HarmonyReport;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<Id, Point> | null>(null);
  const [frame, setFrame] = useState<HarmonyFrame | null>(null);
  const [placing, setPlacing] = useState(false);
  const report = useMemo(() => (points ? measure(points) : null), [measure, points]);

  const reset = () => {
    setPhoto(null);
    setPoints(null);
    setFrame(null);
  };

  if (!photo) {
    return (
      <PhotoRequest
        prompt={prompt}
        onPhoto={(next) => {
          setPhoto(next);
          setPoints(null);
          setPlacing(Boolean(next));
        }}
      />
    );
  }
  if (report && frame && !placing) {
    return (
      <HarmonyViewer
        photo={photo}
        frame={frame}
        report={report}
        heading={heading}
        toolbar={
          <div className="grid grid-cols-2 gap-2">
            <ToolbarButton onClick={() => setPlacing(true)} icon={SlidersHorizontal}>
              Adjust points
            </ToolbarButton>
            <ToolbarButton onClick={reset} icon={ImagePlus}>
              {newPhotoLabel}
            </ToolbarButton>
          </div>
        }
      />
    );
  }
  return (
    <GuidedPointTapper
      photo={photo}
      steps={steps}
      guide={guide}
      initialPoints={points}
      completeLabel={`See ${heading.toLowerCase()}`}
      onComplete={(next, nextFrame) => {
        setPoints(next);
        setFrame(nextFrame);
        setPlacing(false);
      }}
      onChangePhoto={reset}
    />
  );
}

export function FaceHarmonySheet({ photo, onClose }: { photo: string; onClose: () => void }) {
  const { sex } = useHarmonyProfile();
  const [view, setView] = useState<"front" | "side">("front");

  const measureFront = useCallback(
    async (image: HTMLImageElement) => {
      const points = await detectFrontFace(image);
      return points
        ? {
            report: measureFrontHarmony(points, sex),
            frame: { width: image.naturalWidth, height: image.naturalHeight },
          }
        : null;
    },
    [sex],
  );
  const front = useMeasuredPhoto(
    photo,
    measureFront,
    "We couldn't find a clear, front-facing face in this photo. Harmony needs your whole face visible.",
  );
  const measureSide = useCallback(
    (points: SideProfilePoints) => measureSideHarmony(points, sex),
    [sex],
  );

  return (
    <SheetShell
      title="Facial harmony"
      onClose={onClose}
      tabs={<TabBar tabs={FACE_TABS} active={view} onChange={setView} />}
    >
      <div hidden={view !== "front"}>
        <MeasuredView
          photo={photo}
          state={front}
          heading="Front harmony"
          loadingLabel="Mapping 478 facial points on your photo…"
        />
      </div>
      <div hidden={view !== "side"}>
        <GuidedPhotoFlow
          prompt={{
            title: "Upload a side profile photo",
            body: "Stand fully side-on with your head level and your ear, nose, lips, chin, and neck clearly visible. You'll tap 14 guided points, and every side ratio is measured from them.",
            photoLabel: "Side profile photo",
            hint: "Turn fully sideways, look straight ahead, and keep your jaw relaxed.",
          }}
          steps={SIDE_PROFILE_STEPS}
          guide={["noseTip", "chin"]}
          heading="Side harmony"
          newPhotoLabel="New side photo"
          measure={measureSide}
        />
      </div>
    </SheetShell>
  );
}

export function BodyHarmonySheet({ photo, onClose }: { photo: string; onClose: () => void }) {
  const { heightCm } = useHarmonyProfile();
  const [view, setView] = useState<"front" | "side" | "back">("front");

  const measureFront = useCallback(
    (image: HTMLImageElement) => measureBodyPhoto(image, "front", heightCm),
    [heightCm],
  );
  const measureBack = useCallback(
    (image: HTMLImageElement) => measureBodyPhoto(image, "back", heightCm),
    [heightCm],
  );
  const front = useMeasuredPhoto(photo, measureFront, BODY_NOT_FOUND);

  return (
    <SheetShell
      title="Body harmony"
      onClose={onClose}
      tabs={<TabBar tabs={BODY_TABS} active={view} onChange={setView} />}
    >
      <div hidden={view !== "front"}>
        <MeasuredView
          photo={photo}
          state={front}
          heading="Front harmony"
          loadingLabel="Mapping your body outline and joints…"
        />
      </div>
      <div hidden={view !== "side"}>
        <GuidedPhotoFlow
          prompt={{
            title: "Upload a side photo",
            body: "Stand side-on and relaxed, head to toe in frame, with your hair clear of your ear and neck. You'll tap 6 guided points to measure head, shoulder, and knee posture.",
            photoLabel: "Side body photo",
            hint: "Stand naturally side-on with the camera at hip height.",
          }}
          steps={BODY_SIDE_STEPS}
          guide={["hip", "ankle"]}
          heading="Side harmony"
          newPhotoLabel="New side photo"
          measure={measureBodySide}
        />
      </div>
      <div hidden={view !== "back"}>
        <UploadedPhotoFlow
          prompt={{
            title: "Upload a back photo",
            body: "Stand with your back to the camera, head to toe in frame, feet about hip-width apart, and arms slightly away from your sides.",
            photoLabel: "Back body photo",
            hint: "Stand relaxed with your weight on both feet and the camera at hip height.",
          }}
          heading="Back harmony"
          loadingLabel="Mapping your body outline and joints…"
          newPhotoLabel="New back photo"
          notFoundMessage={BODY_NOT_FOUND}
          measure={measureBack}
        />
      </div>
    </SheetShell>
  );
}
