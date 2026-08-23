interface Props {
  size?: number;
  className?: string;
}

// Stylized gradient-blob athlete with morphing blobs and a bouncing silhouette.
export function AnimatedAthlete({ size = 280, className = "" }: Props) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* Outer halo blob */}
      <div
        className="absolute inset-0 animate-blob"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, var(--color-neon), transparent 60%), radial-gradient(circle at 70% 70%, oklch(0.6 0.2 280 / 0.6), transparent 65%)",
          filter: "blur(8px)",
        }}
      />
      {/* Inner blob */}
      <div
        className="absolute animate-blob"
        style={{
          inset: "18%",
          background: "linear-gradient(135deg, var(--color-neon), oklch(0.85 0.18 160))",
          animationDuration: "5s",
          animationDirection: "reverse",
        }}
      />
      {/* Spinning ring */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 animate-spin-slow">
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="var(--color-neon)"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="4 10"
        />
      </svg>
      {/* Athlete silhouette */}
      <div className="absolute inset-0 grid place-items-center">
        <svg
          viewBox="0 0 120 160"
          width={size * 0.55}
          height={size * 0.75}
          className="animate-athlete drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="ath" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.14 0 0)" />
              <stop offset="100%" stopColor="oklch(0.3 0 0)" />
            </linearGradient>
          </defs>
          {/* head */}
          <circle cx="60" cy="22" r="14" fill="url(#ath)" />
          {/* torso */}
          <path d="M40 40 Q60 32 80 40 L78 86 Q60 92 42 86 Z" fill="url(#ath)" />
          {/* arms raised */}
          <path d="M40 44 Q22 38 18 18 L26 16 Q32 34 46 50 Z" fill="url(#ath)" />
          <path d="M80 44 Q98 38 102 18 L94 16 Q88 34 74 50 Z" fill="url(#ath)" />
          {/* legs squat */}
          <path d="M44 86 Q36 110 28 138 L42 142 Q52 116 58 96 Z" fill="url(#ath)" />
          <path d="M76 86 Q84 110 92 138 L78 142 Q68 116 62 96 Z" fill="url(#ath)" />
          {/* neon accent stripe */}
          <path d="M48 56 L72 56 L70 78 L50 78 Z" fill="var(--color-neon)" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
}
