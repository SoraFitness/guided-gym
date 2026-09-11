import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, ImagePlus, RotateCcw, Undo2 } from "lucide-react";
import type { Point } from "@/lib/harmony/geometry";
import type { HarmonyFrame } from "./HarmonyViewer";

const NEON = "#b7ff3e";

export interface GuidedStep<Id extends string = string> {
  id: Id;
  label: string;
  instruction: string;
}

type PlacedPoints<Id extends string> = Partial<Record<Id, Point>>;

/** Walks the member through tapping each step's point on their photo, in order. */
export function GuidedPointTapper<Id extends string>({
  photo,
  steps,
  initialPoints,
  guide,
  completeLabel,
  onComplete,
  onChangePhoto,
}: {
  photo: string;
  steps: readonly GuidedStep<Id>[];
  initialPoints: Record<Id, Point> | null;
  /** Two points joined by a dashed guide line once both are placed. */
  guide?: readonly [Id, Id];
  completeLabel: string;
  onComplete: (points: Record<Id, Point>, frame: HarmonyFrame) => void;
  onChangePhoto: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [frame, setFrame] = useState<HarmonyFrame | null>(null);
  const [points, setPoints] = useState<PlacedPoints<Id>>(initialPoints ?? {});
  const [dragging, setDragging] = useState<Id | null>(null);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setFrame({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = photo;
    return () => {
      active = false;
    };
  }, [photo]);

  const placed = steps.filter((step) => points[step.id]);
  const nextIndex = steps.findIndex((step) => !points[step.id]);
  const nextStep = nextIndex >= 0 ? steps[nextIndex] : null;
  const size = frame ? Math.max(frame.width, frame.height) : 0;
  const guideFrom = guide ? points[guide[0]] : undefined;
  const guideTo = guide ? points[guide[1]] : undefined;

  const toImagePoint = (event: PointerEvent<SVGSVGElement>): Point | null => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const point = toImagePoint(event);
    if (!point || !frame) return;
    const nearest = placed
      .map((step) => ({
        id: step.id,
        gap: Math.hypot(points[step.id]!.x - point.x, points[step.id]!.y - point.y),
      }))
      .sort((a, b) => a.gap - b.gap)[0];
    if (nearest && nearest.gap <= size * 0.03) {
      setDragging(nearest.id);
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    // Pick the step from the latest state so quick taps never land on the same point.
    setPoints((current) => {
      const step = steps.find((item) => !current[item.id]);
      return step ? ({ ...current, [step.id]: point } as PlacedPoints<Id>) : current;
    });
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const point = toImagePoint(event);
    if (point) {
      setPoints((current) => ({ ...current, [dragging]: point }) as PlacedPoints<Id>);
    }
  };

  const undo = () => {
    const last = placed.at(-1);
    if (!last) return;
    setPoints((current) => {
      const next = { ...current };
      delete next[last.id];
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-[22px] border border-neon/20 bg-neon/[0.06] p-4">
        {nextStep ? (
          <>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neon">
              Point {nextIndex + 1} of {steps.length}
            </p>
            <p className="mt-1 text-sm font-bold">{nextStep.label}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">
              {nextStep.instruction}
            </p>
          </>
        ) : (
          <>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neon">
              All points placed
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/60">
              Drag any point to fine-tune it, then see your results.
            </p>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-[26px] border border-white/[0.09] bg-black">
        {frame ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${frame.width} ${frame.height}`}
            className="block w-full touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setDragging(null)}
            onPointerCancel={() => setDragging(null)}
            role="img"
            aria-label="Your photo. Tap to place the highlighted point."
          >
            <image href={photo} x={0} y={0} width={frame.width} height={frame.height} />
            {guideFrom && guideTo && (
              <line
                x1={guideFrom.x}
                y1={guideFrom.y}
                x2={guideTo.x}
                y2={guideTo.y}
                stroke="#ffffff"
                strokeOpacity={0.5}
                strokeWidth={size * 0.003}
                strokeDasharray={`${size * 0.01} ${size * 0.008}`}
              />
            )}
            {placed.map((step) => {
              const point = points[step.id]!;
              const order = steps.findIndex((item) => item.id === step.id) + 1;
              return (
                <g key={step.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={size * (dragging === step.id ? 0.014 : 0.009)}
                    fill={NEON}
                    stroke="#000000"
                    strokeWidth={size * 0.0025}
                  />
                  <text
                    x={point.x + size * 0.014}
                    y={point.y - size * 0.012}
                    fill="#ffffff"
                    fontSize={size * 0.022}
                    fontWeight={800}
                    paintOrder="stroke"
                    stroke="rgba(0,0,0,0.7)"
                    strokeWidth={size * 0.004}
                  >
                    {order}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="aspect-[3/4]" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={!placed.length}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] text-xs font-semibold disabled:opacity-40"
        >
          <Undo2 className="size-3.5" /> Undo
        </button>
        <button
          type="button"
          onClick={() => setPoints({})}
          disabled={!placed.length}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] text-xs font-semibold disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" /> Reset
        </button>
        <button
          type="button"
          onClick={onChangePhoto}
          className="flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/[0.06] text-xs font-semibold"
        >
          <ImagePlus className="size-3.5" /> Photo
        </button>
      </div>
      <button
        type="button"
        disabled={Boolean(nextStep) || !frame}
        onClick={() => frame && onComplete(points as Record<Id, Point>, frame)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-neon text-sm font-black text-neon-foreground disabled:opacity-40"
      >
        <Check className="size-4" /> {completeLabel}
      </button>
    </div>
  );
}
