import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Pause, Play, Gauge, RotateCcw, Loader2 } from "lucide-react";
import { AvatarModel, DEFAULT_POSE, type AvatarGender, type Pose } from "./AvatarModel";
import { getPose } from "./ExerciseAnimationController";
import type { AnimationType } from "@/lib/exerciseCoaching";
import { ExerciseFallback } from "./ExerciseFallback";
import { cn } from "@/lib/utils";

interface Props {
  animation: AnimationType;
  gender: AvatarGender;
  defaultSpeed?: number;
  className?: string;
  showControls?: boolean;
  label?: string;
}

function AnimatedAvatar({
  animation,
  gender,
  playing,
  speed,
}: {
  animation: AnimationType;
  gender: AvatarGender;
  playing: boolean;
  speed: number;
}) {
  const [pose, setPose] = useState<Pose>(DEFAULT_POSE);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (playing) timeRef.current += delta;
    setPose(getPose(animation, timeRef.current, speed));
  });

  return <AvatarModel gender={gender} pose={pose} />;
}

class ViewerErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[Exercise3DViewer] falling back to 2D", err);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function LoadingSkeleton({ label }: { label?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-[#0c0f14] to-[#05070a]">
      <div className="flex flex-col items-center gap-2 text-white/70">
        <Loader2 className="size-6 animate-spin text-neon" />
        <div className="text-[11px] font-semibold">{label ?? "Loading 3D demo…"}</div>
      </div>
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
}: Props) {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(defaultSpeed);
  const [view, setView] = useState<"front" | "side">("side");
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
    setWebgl(supportsWebGL());
  }, []);

  const cameraPos: [number, number, number] = view === "front" ? [0, 1.1, 3.2] : [2.8, 1.1, 1.6];

  const fallback = <ExerciseFallback animation={animation} label={label} />;

  return (
    <div
      className={cn(
        "relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#0c0f14] to-[#05070a] border border-white/[0.06]",
        className,
      )}
    >
      <div className="aspect-[4/5] w-full relative">
        {!mounted || webgl === null ? (
          <LoadingSkeleton />
        ) : webgl === false ? (
          fallback
        ) : (
          <ViewerErrorBoundary fallback={fallback}>
            <Suspense fallback={<LoadingSkeleton />}>
              <Canvas
                shadows
                dpr={[1, 2]}
                frameloop="always"
                gl={{ powerPreference: "high-performance", antialias: true, failIfMajorPerformanceCaveat: false }}
                camera={{ position: cameraPos, fov: 32 }}
                onCreated={({ camera }) => camera.lookAt(new THREE.Vector3(0, 1, 0))}
              >
                <color attach="background" args={["#070a0f"]} />
                <ambientLight intensity={0.45} />
                <directionalLight
                  position={[3, 5, 4]}
                  intensity={1.2}
                  castShadow
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                />
                <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#7cf2c4" />
                <AnimatedAvatar animation={animation} gender={gender} playing={playing} speed={speed} />
                <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={6} blur={2.4} far={3} />
                <Environment preset="city" />
              </Canvas>
            </Suspense>
          </ViewerErrorBoundary>
        )}
      </div>

      {showControls && (
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent">
          <button
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
            className="size-10 rounded-full bg-neon text-neon-foreground grid place-items-center active:scale-95 transition"
          >
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => setSpeed((s) => (s <= 0.4 ? 1 : s === 1 ? 0.4 : 1))}
            className="h-10 px-3 rounded-full bg-white/10 backdrop-blur text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition"
          >
            <Gauge className="size-3.5" />
            {speed === 1 ? "Normal" : speed < 1 ? "Slow-mo" : `${speed}×`}
          </button>
          <div className="ml-auto flex rounded-full bg-white/10 backdrop-blur p-0.5 text-[11px] font-semibold">
            {(["front", "side"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "h-9 px-3 rounded-full capitalize transition",
                  view === v ? "bg-neon text-neon-foreground" : "text-white/80",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setPlaying(true);
              setSpeed(1);
              setView("side");
            }}
            aria-label="Reset"
            className="size-10 rounded-full bg-white/10 backdrop-blur grid place-items-center active:scale-95 transition"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
