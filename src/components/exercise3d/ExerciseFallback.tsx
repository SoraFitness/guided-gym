import { Dumbbell } from "lucide-react";
import type { AnimationType } from "@/lib/exerciseCoaching";
import { cn } from "@/lib/utils";

interface Props {
  animation: AnimationType;
  className?: string;
  label?: string;
}

/**
 * Lightweight animated SVG fallback shown when WebGL / Three.js
 * is unavailable or errors out. Keeps the exercise screen alive
 * with a looping silhouette that matches the current movement.
 */
export function ExerciseFallback({ animation, className, label }: Props) {
  const animClass =
    animation === "squat"
      ? "anim-squat"
      : animation === "pushup" || animation === "plank"
      ? "anim-pushup"
      : animation === "lunge"
      ? "anim-lunge"
      : animation === "shoulderPress"
      ? "anim-press"
      : animation === "curl"
      ? "anim-curl"
      : "anim-idle";

  return (
    <div
      className={cn(
        "relative w-full h-full grid place-items-center bg-gradient-to-b from-[#0c0f14] to-[#05070a] overflow-hidden",
        className,
      )}
    >
      {/* glow */}
      <div className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 40% at 50% 55%, oklch(0.92 0.21 130 / 0.18), transparent 70%)",
        }}
      />

      <svg
        viewBox="0 0 200 240"
        className={cn("w-3/5 max-w-[260px] drop-shadow-[0_6px_24px_rgba(180,255,120,0.25)]", animClass)}
        aria-hidden
      >
        {/* head */}
        <circle cx="100" cy="42" r="16" fill="currentColor" className="text-neon" />
        {/* torso */}
        <rect x="80" y="60" width="40" height="60" rx="14" fill="currentColor" className="text-neon/85" />
        {/* arms */}
        <g className="origin-[100px_72px] arm-group">
          <rect x="55" y="68" width="30" height="10" rx="5" fill="currentColor" className="text-neon/70" />
          <rect x="115" y="68" width="30" height="10" rx="5" fill="currentColor" className="text-neon/70" />
        </g>
        {/* legs */}
        <g className="origin-[100px_120px] leg-group">
          <rect x="82" y="120" width="14" height="70" rx="7" fill="currentColor" className="text-neon/75" />
          <rect x="104" y="120" width="14" height="70" rx="7" fill="currentColor" className="text-neon/75" />
        </g>
        {/* ground shadow */}
        <ellipse cx="100" cy="210" rx="46" ry="6" fill="black" opacity="0.45" />
      </svg>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
        <Dumbbell className="size-3.5" /> {label ?? "Animated demo"}
      </div>

      <style>{`
        @keyframes squatAnim {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(18px) scaleY(0.88); }
        }
        @keyframes pushupAnim {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(10px) rotate(0deg); }
        }
        @keyframes lungeAnim {
          0%, 100% { transform: translateX(-6px); }
          50% { transform: translateX(6px) translateY(6px); }
        }
        @keyframes pressArms {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-22px); }
        }
        @keyframes curlArms {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-70deg); }
        }
        @keyframes idleBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .anim-squat { animation: squatAnim 1.8s ease-in-out infinite; transform-origin: center; }
        .anim-pushup { animation: pushupAnim 1.8s ease-in-out infinite; transform-origin: center; }
        .anim-lunge { animation: lungeAnim 2s ease-in-out infinite; transform-origin: center; }
        .anim-press .arm-group { animation: pressArms 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .anim-curl .arm-group { animation: curlArms 1.4s ease-in-out infinite; transform-box: fill-box; transform-origin: left center; }
        .anim-idle { animation: idleBob 2.4s ease-in-out infinite; transform-origin: center; }
      `}</style>
    </div>
  );
}
