import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { AlertTriangle, Gauge, Pause, Play, RotateCcw, Scan } from "lucide-react";
import type { DemoAvatarGender } from "@/lib/demoModel";
import type { AnimationType, DemoEquipment, MuscleKey } from "@/lib/exerciseCoaching";
import { MUSCLE_LABELS } from "@/lib/exerciseCoaching";
import { cn } from "@/lib/utils";
import { SoraAthlete } from "./SoraAthlete";
import { SceneProps } from "./proceduralEquipment";
import { ResponsiveExerciseCamera } from "./ResponsiveExerciseCamera";
import { cameraControlLimits } from "./exerciseCameraFit";
import {
  getExerciseAnimationConfig,
  type ExerciseAnimationConfig,
  type ViewPreset,
} from "./exerciseSceneConfig";

interface Props {
  animation: AnimationType;
  gender: DemoAvatarGender;
  defaultSpeed?: number;
  className?: string;
  showControls?: boolean;
  label?: string;
  exerciseId?: string;
  primaryMuscles?: MuscleKey[];
  secondaryMuscles?: MuscleKey[];
  equipment?: DemoEquipment;
}

type FitState = {
  distance: number;
  target: [number, number, number];
};

type BoundaryProps = {
  children: ReactNode;
  fallback: (error: unknown) => ReactNode;
  resetKey: number | string;
};

const SPEED_PRESETS = [0.5, 1, 1.5] as const;
const VIEW_PRESETS: ViewPreset[] = ["front", "side", "rear"];

class ViewerErrorBoundary extends Component<BoundaryProps, { error: unknown | null }> {
  state: { error: unknown | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown) {
    console.error("[Ascendr Exercise3D] Failed to render the demo scene.", error);
  }

  componentDidUpdate(prevProps: BoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

function defaultView(config: ExerciseAnimationConfig): ViewPreset {
  return config.animation === "benchPress" ? "front" : "side";
}

function normalizeSpeed(value: number) {
  return SPEED_PRESETS.reduce((best, speed) =>
    Math.abs(speed - value) < Math.abs(best - value) ? speed : best,
  );
}

function cycleSpeed(value: number) {
  const index = SPEED_PRESETS.findIndex((speed) => Math.abs(speed - value) < 0.01);
  return SPEED_PRESETS[(index + 1 + SPEED_PRESETS.length) % SPEED_PRESETS.length];
}

function speedLabel(speed: number) {
  return Number.isInteger(speed) ? `${speed.toFixed(0)}x` : `${speed.toFixed(1)}x`;
}

function MuscleLegend({ primary, secondary }: { primary: MuscleKey[]; secondary: MuscleKey[] }) {
  const primaryText = primary.map((m) => MUSCLE_LABELS[m]).join(", ");
  const secondaryText = secondary.map((m) => MUSCLE_LABELS[m]).join(", ");

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-col gap-1.5">
      <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-white/[0.06] bg-black/55 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">
        <span className="size-2 rounded-full bg-[#ff2038] shadow-[0_0_12px_rgba(255,32,56,0.8)]" />
        <span className="truncate">Primary: {primaryText || "Full body"}</span>
      </div>
      <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-white/[0.06] bg-black/45 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur">
        <span className="size-2 rounded-full bg-[#ff7a2f] shadow-[0_0_10px_rgba(255,122,47,0.65)]" />
        <span className="truncate">Secondary: {secondaryText || "Stabilizers"}</span>
      </div>
    </div>
  );
}

function ViewerFailurePanel({ label, error }: { label?: string; error: unknown }) {
  const message = error instanceof Error ? error.message : "The 3D scene could not be rendered.";

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#111720] via-[#080b10] to-[#030405] p-5">
      <div className="w-full max-w-sm rounded-[28px] border border-red-300/15 bg-white/[0.055] p-5 text-center shadow-2xl shadow-black/45 backdrop-blur-xl">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-red-500/16 text-red-200">
          <AlertTriangle className="size-5" />
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-white">3D demo unavailable</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/68">
          {label ?? "This exercise"} could not render on this device. The form instructions below
          still cover the full movement.
        </p>
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-black/40 p-3 text-left font-mono text-[10px] leading-relaxed text-white/70">
          {message}
        </div>
      </div>
    </div>
  );
}

function useViewerVisibility(rootRef: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootRef]);

  return visible;
}

function ViewerControls({
  playing,
  speed,
  view,
  cameraPresets,
  onPlayToggle,
  onSpeedCycle,
  onViewChange,
  onRestart,
  onResetCamera,
}: {
  playing: boolean;
  speed: number;
  view: ViewPreset;
  cameraPresets: ExerciseAnimationConfig["cameraPresets"];
  onPlayToggle: () => void;
  onSpeedCycle: () => void;
  onViewChange: (view: ViewPreset) => void;
  onRestart: () => void;
  onResetCamera: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-20 flex items-center gap-2 rounded-3xl border border-white/[0.08] bg-black/55 p-2 shadow-2xl shadow-black/35 backdrop-blur-xl pb-safe">
      <button
        onClick={onPlayToggle}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-neon text-neon-foreground transition active:scale-95"
      >
        {playing ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="ml-0.5 size-4 fill-current" />
        )}
      </button>
      <button
        onClick={onSpeedCycle}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[11px] font-semibold text-white backdrop-blur transition active:scale-95"
        aria-label={`Playback speed ${speedLabel(speed)}`}
      >
        <Gauge className="size-3.5" />
        {speedLabel(speed)}
      </button>
      <div className="flex min-w-0 flex-1 rounded-full bg-white/10 p-0.5 text-[11px] font-semibold backdrop-blur">
        {VIEW_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => onViewChange(preset)}
            aria-pressed={view === preset}
            className={cn(
              "h-9 min-w-0 flex-1 rounded-full px-2 transition",
              view === preset ? "bg-neon text-neon-foreground" : "text-white/78",
            )}
          >
            {cameraPresets[preset].label}
          </button>
        ))}
      </div>
      <button
        onClick={onResetCamera}
        aria-label="Reset camera"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95"
      >
        <Scan className="size-4" />
      </button>
      <button
        onClick={onRestart}
        aria-label="Restart animation"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition active:scale-95"
      >
        <RotateCcw className="size-4" />
      </button>
    </div>
  );
}

export function Exercise3DViewer({
  animation,
  gender,
  defaultSpeed = 1,
  className,
  showControls = true,
  label,
  exerciseId,
  primaryMuscles = [],
  secondaryMuscles = [],
  equipment,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const config = useMemo(
    () => getExerciseAnimationConfig({ exerciseId, animation, equipment, name: label }),
    [animation, equipment, exerciseId, label],
  );
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(() => normalizeSpeed(defaultSpeed));
  const [view, setView] = useState<ViewPreset>(() => defaultView(config));
  const [restartToken, setRestartToken] = useState(0);
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [fitState, setFitState] = useState<FitState>({
    distance: Math.max(...config.fitBox.size),
    target: config.fitBox.center,
  });
  const viewerVisible = useViewerVisibility(rootRef);
  const selectedModel = gender === "female" ? "Female" : "Male";
  const controls = useMemo(
    () => cameraControlLimits(config, fitState.distance),
    [config, fitState.distance],
  );
  const handleFitChange = useCallback((fit: FitState) => {
    setFitState((current) => {
      if (
        Math.abs(current.distance - fit.distance) < 0.01 &&
        current.target.every((value, index) => Math.abs(value - fit.target[index]) < 0.01)
      ) {
        return current;
      }
      return fit;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSpeed(normalizeSpeed(defaultSpeed));
    setView(defaultView(config));
    setFitState({
      distance: Math.max(...config.fitBox.size),
      target: config.fitBox.center,
    });
  }, [config, defaultSpeed]);

  const activePrimary = primaryMuscles.length ? primaryMuscles : config.primaryMuscles;
  const activeSecondary = secondaryMuscles.length ? secondaryMuscles : config.secondaryMuscles;

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-[#171c24] via-[#090d13] to-[#030405] text-white shadow-2xl shadow-black/50",
        className ?? "h-[clamp(360px,calc(100dvh-7rem),720px)]",
      )}
    >
      <div className="relative h-full w-full">
        {mounted && (
          <ViewerErrorBoundary
            resetKey={`${gender}-${config.exerciseId}-${config.clip}`}
            fallback={(error) => <ViewerFailurePanel label={label} error={error} />}
          >
            <Canvas
              shadows
              dpr={[1, 1.7]}
              frameloop="always"
              gl={{
                powerPreference: "high-performance",
                antialias: true,
                alpha: false,
                failIfMajorPerformanceCaveat: false,
                // Keeps the drawing buffer readable so in-app screenshots and
                // browser captures of the demo aren't blank.
                preserveDrawingBuffer: true,
              }}
              camera={{
                position: [0, 1.2, 4],
                fov: config.cameraPresets[view].fov,
                near: 0.03,
                far: 40,
              }}
            >
              <color attach="background" args={["#05070b"]} />
              <fog attach="fog" args={["#05070b", 6.5, 12]} />
              <ResponsiveExerciseCamera
                config={config}
                view={view}
                resetToken={cameraResetToken}
                onFitChange={handleFitChange}
              />
              {/* No HDR environment map — it requires an external CDN fetch that can
                  suspend the scene forever offline. The light rig below covers it. */}
              <ambientLight intensity={0.3} />
              <hemisphereLight args={["#dfe8ff", "#111722", 0.5]} />
              <directionalLight
                position={[3.4, 4.8, 3.2]}
                intensity={1.45}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
              />
              <spotLight
                position={[-2.6, 3.4, 2.4]}
                angle={0.5}
                penumbra={0.62}
                intensity={0.72}
                color="#f5fff4"
              />
              <pointLight position={[0, 1.4, -2.6]} intensity={0.58} color="#ff3046" />
              <pointLight position={[2.2, 1.6, -0.8]} intensity={0.38} color="#b7ff4a" />
              <Suspense fallback={null}>
                <SceneProps props={config.props} />
                <SoraAthlete
                  gender={gender}
                  clip={config.clip}
                  held={config.held}
                  playing={playing && viewerVisible}
                  speed={speed}
                  playbackSpeed={config.playbackSpeed}
                  restartToken={restartToken}
                  primaryMuscles={activePrimary}
                  secondaryMuscles={activeSecondary}
                />
              </Suspense>
              <mesh receiveShadow position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[3.2, 96]} />
                <meshStandardMaterial color="#0d1219" roughness={0.88} metalness={0.04} />
              </mesh>
              <ContactShadows
                position={[0, 0.004, 0]}
                opacity={0.46}
                scale={5.6}
                blur={2.7}
                far={3.5}
              />
              <OrbitControls
                makeDefault
                enablePan={false}
                enableZoom
                enableDamping
                dampingFactor={0.08}
                minDistance={controls.minDistance}
                maxDistance={controls.maxDistance}
                minPolarAngle={config.orbit.minPolarAngle}
                maxPolarAngle={config.orbit.maxPolarAngle}
                target={fitState.target}
              />
            </Canvas>
          </ViewerErrorBoundary>
        )}

        <MuscleLegend primary={activePrimary} secondary={activeSecondary} />
        <div className="pointer-events-none absolute bottom-[5.4rem] left-3 z-10 rounded-full border border-white/[0.06] bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/65 backdrop-blur">
          {selectedModel} Ascendr demo model
        </div>
      </div>

      {showControls && (
        <ViewerControls
          playing={playing}
          speed={speed}
          view={view}
          cameraPresets={config.cameraPresets}
          onPlayToggle={() => setPlaying((value) => !value)}
          onSpeedCycle={() => setSpeed((value) => cycleSpeed(value))}
          onViewChange={setView}
          onRestart={() => {
            setPlaying(true);
            setSpeed(normalizeSpeed(defaultSpeed));
            setRestartToken((token) => token + 1);
          }}
          onResetCamera={() => setCameraResetToken((token) => token + 1)}
        />
      )}
    </div>
  );
}
