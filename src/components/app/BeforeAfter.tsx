import { ChevronsLeftRight } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Drag the divider to wipe between an earlier and a later photo. */
export function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
  className,
}: {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setSplit(Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={frame}
      className={cn(
        "relative h-[440px] touch-pan-y select-none overflow-hidden rounded-[28px] border border-hairline bg-black",
        className,
      )}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={(event) => dragging.current && moveTo(event.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <img
        src={after}
        alt={`After, ${afterLabel}`}
        draggable={false}
        className="absolute inset-0 size-full object-cover object-top"
      />
      <img
        src={before}
        alt={`Before, ${beforeLabel}`}
        draggable={false}
        className="absolute inset-0 size-full object-cover object-top"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-neon"
        style={{ left: `${split}%` }}
      >
        <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[14px] bg-neon text-neon-foreground">
          <ChevronsLeftRight className="size-5" />
        </span>
      </div>
      <span className="font-data absolute left-3 top-3 rounded-[8px] bg-black/60 px-2 py-1 text-[11px] font-semibold uppercase text-white backdrop-blur-md">
        Before · {beforeLabel}
      </span>
      <span className="font-data absolute right-3 top-3 rounded-[8px] bg-neon px-2 py-1 text-[11px] font-semibold uppercase text-neon-foreground">
        Now · {afterLabel}
      </span>
      {(
        ["bottom-3 left-3 border-b-2 border-l-2", "bottom-3 right-3 border-b-2 border-r-2"] as const
      ).map((position) => (
        <span
          key={position}
          aria-hidden
          className={cn("pointer-events-none absolute size-5 border-white/35", position)}
        />
      ))}
      <input
        type="range"
        min={4}
        max={96}
        value={Math.round(split)}
        onChange={(event) => setSplit(Number(event.target.value))}
        aria-label="Compare before and after"
        className="sr-only"
      />
    </div>
  );
}
