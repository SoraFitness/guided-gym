interface Props {
  score: number;
  size?: number;
  label?: string;
}
export function ScoreRing({ score, size = 120, label = "Score" }: Props) {
  const pct = Math.max(0, Math.min(100, score));
  const r = (size - 16) / 2;
  const C = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 size-full">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(1 0 0 / 0.07)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-neon)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * C} ${C}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-extrabold tabular-nums leading-none">{Math.round(pct)}</div>
          <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
