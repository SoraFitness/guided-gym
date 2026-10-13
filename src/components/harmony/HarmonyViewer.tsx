import { useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { angleAt, distance, type Box, type Point } from "@/lib/harmony/geometry";
import type { HarmonyAngle, HarmonyMetric, HarmonyReport } from "@/lib/harmony/scoring";
import { cn } from "@/lib/utils";

export interface HarmonyFrame {
  width: number;
  height: number;
}

const NEON = "#b7ff3e";

function scoreTone(metric: HarmonyMetric) {
  if (!metric.reliable) return "border-hairline bg-white/[0.05] text-white/45";
  if (metric.score === null) return "border-white/15 bg-white/[0.06] text-white/75";
  if (metric.score >= 8) return "border-neon/25 bg-neon/10 text-neon";
  if (metric.score >= 5) return "border-amber-400/25 bg-amber-400/10 text-amber-300";
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

/** Short value line for the photo caption. */
function captionLine(metric: HarmonyMetric) {
  if (!metric.reliable) return "Not measured on this photo";
  return metric.ideal
    ? `${metric.display} · ideal ${metric.ideal}`
    : `${metric.display} · not scored`;
}

/** Full value line for the detail card. */
function detailLine(metric: HarmonyMetric) {
  if (!metric.reliable) return "Not measured on this photo, so it isn't scored.";
  if (metric.score === null || !metric.ideal) {
    return `Yours: ${metric.display}. There's no agreed ideal for this measurement, so it isn't scored.`;
  }
  return `Yours: ${metric.display} · Ideal: ${metric.ideal} · ${metric.score.toFixed(1)}/10`;
}

function unitVector(from: Point, to: Point) {
  const length = distance(from, to) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

/** A filled wedge for the angle at `vertex`, drawn along the shorter arc. */
function arcPath({ vertex, from, to }: HarmonyAngle, radius: number) {
  const a = unitVector(vertex, from);
  const b = unitVector(vertex, to);
  const start = { x: vertex.x + a.x * radius, y: vertex.y + a.y * radius };
  const end = { x: vertex.x + b.x * radius, y: vertex.y + b.y * radius };
  const sweep = a.x * b.y - a.y * b.x > 0 ? 1 : 0;
  return `M ${vertex.x} ${vertex.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweep} ${end.x} ${end.y} Z`;
}

function angleLabelPosition({ vertex, from, to }: HarmonyAngle, offset: number) {
  const a = unitVector(vertex, from);
  const b = unitVector(vertex, to);
  const sum = { x: a.x + b.x, y: a.y + b.y };
  const length = Math.hypot(sum.x, sum.y);
  const direction = length > 0.1 ? { x: sum.x / length, y: sum.y / length } : { x: -a.y, y: a.x };
  return { x: vertex.x + direction.x * offset, y: vertex.y + direction.y * offset };
}

function MetricOverlay({ metric, unit }: { metric: HarmonyMetric; unit: number }) {
  const stroke = unit * 0.45;
  const lineProps = {
    stroke: "#f4ffe8",
    strokeOpacity: 0.92,
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
  };
  return (
    <g>
      {metric.overlay.lines.map(([a, b], index) => (
        <line key={`line-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...lineProps} />
      ))}
      {metric.overlay.angles.map((angle, index) => {
        const radius =
          Math.min(distance(angle.vertex, angle.from), distance(angle.vertex, angle.to)) * 0.28;
        const label = angleLabelPosition(angle, radius * 1.85);
        return (
          <g key={`angle-${index}`}>
            <line
              x1={angle.vertex.x}
              y1={angle.vertex.y}
              x2={angle.from.x}
              y2={angle.from.y}
              {...lineProps}
            />
            <line
              x1={angle.vertex.x}
              y1={angle.vertex.y}
              x2={angle.to.x}
              y2={angle.to.y}
              {...lineProps}
            />
            <path
              d={arcPath(angle, radius)}
              fill={NEON}
              fillOpacity={0.2}
              stroke={NEON}
              strokeWidth={stroke}
            />
            <text
              x={label.x}
              y={label.y}
              fill="#ffffff"
              fontSize={unit * 3.4}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="middle"
              paintOrder="stroke"
              stroke="rgba(0,0,0,0.65)"
              strokeWidth={unit * 0.7}
            >
              {angleAt(angle.from, angle.vertex, angle.to).toFixed(1)}°
            </text>
          </g>
        );
      })}
      {metric.overlay.points.map((point, index) => (
        <circle
          key={`point-${index}`}
          cx={point.x}
          cy={point.y}
          r={unit * 0.9}
          fill={NEON}
          stroke="#000000"
          strokeWidth={unit * 0.25}
        />
      ))}
    </g>
  );
}

function clampFocus(focus: Box, frame: HarmonyFrame): Box {
  const x = Math.max(0, focus.x);
  const y = Math.max(0, focus.y);
  return {
    x,
    y,
    width: Math.min(frame.width, focus.x + focus.width) - x,
    height: Math.min(frame.height, focus.y + focus.height) - y,
  };
}

export function HarmonyViewer({
  photo,
  frame,
  report,
  heading,
  toolbar,
}: {
  photo: string;
  frame: HarmonyFrame;
  report: HarmonyReport;
  heading: string;
  toolbar?: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState(
    () => report.metrics.find((metric) => metric.reliable)?.id ?? report.metrics[0]?.id,
  );
  const selected = report.metrics.find((metric) => metric.id === selectedId) ?? report.metrics[0];
  const focus = clampFocus(report.focus, frame);
  const unit = Math.max(focus.width, focus.height) / 100;
  const aspect = Math.min(1.2, Math.max(0.55, focus.width / focus.height));
  const scoredCount = report.metrics.filter(
    (metric) => metric.reliable && metric.score !== null,
  ).length;

  return (
    <div className="space-y-4">
      <section
        className="relative overflow-hidden rounded-[24px] border border-hairline bg-black"
        style={{ aspectRatio: String(aspect) }}
      >
        <svg
          viewBox={`${focus.x} ${focus.y} ${focus.width} ${focus.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={selected ? `${selected.label} measured on your photo` : "Your photo"}
        >
          <image
            href={photo}
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            preserveAspectRatio="none"
            opacity={0.8}
          />
          {selected && <MetricOverlay metric={selected} unit={unit} />}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-hairline bg-black/55 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neon backdrop-blur">
          Ascendr harmony
        </span>
        {selected && (
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
                {heading}
              </p>
              <p className="mt-1 text-base font-bold leading-tight">{selected.label}</p>
              <p className="mt-0.5 text-[13px] text-white/60">{captionLine(selected)}</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="text-4xl font-bold tabular-nums">
                {selected.reliable && selected.score !== null ? selected.score.toFixed(1) : "—"}
              </span>
              <span className="text-xs font-bold text-white/45">/10</span>
            </p>
          </div>
        )}
      </section>

      {toolbar}

      <section className="rounded-[24px] border border-hairline bg-white/[0.035] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neon">{heading}</p>
            <h3 className="mt-1 text-lg font-bold">Your ratios</h3>
            {scoredCount < report.metrics.length && (
              <p className="mt-0.5 text-[12px] text-white/45">
                Score uses {scoredCount} of {report.metrics.length} measurements
              </p>
            )}
          </div>
          <p className="text-right">
            <span className="text-2xl font-bold tabular-nums">
              {report.score === null ? "—" : report.score.toFixed(1)}
            </span>
            <span className="text-[12px] font-bold text-white/45">/10</span>
          </p>
        </div>
        {report.warnings.map((warning) => (
          <p
            key={warning}
            className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-[13px] leading-relaxed text-amber-100/90"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
            {warning}
          </p>
        ))}
        <div className="mt-3 grid gap-1">
          {report.metrics.map((metric) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => setSelectedId(metric.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                metric.id === selected?.id
                  ? "border-neon/30 bg-neon/[0.06]"
                  : "border-transparent hover:bg-white/[0.03]",
              )}
            >
              <span className="min-w-0 text-[13px] font-semibold">{metric.label}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-bold tabular-nums",
                  scoreTone(metric),
                )}
              >
                {metric.reliable ? metric.display : "—"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="rounded-[24px] border border-hairline bg-white/[0.035] p-4">
          <div className="flex items-center gap-2 text-neon">
            <Info className="size-4" />
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em]">{selected.label}</h3>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-white/70">{selected.explanation}</p>
          <p className="mt-2 text-[13px] text-white/45">{detailLine(selected)}</p>
          {selected.source && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/35">
              Source: {selected.source}
            </p>
          )}
        </section>
      )}

      <p className="px-1 text-[12px] leading-relaxed text-white/40">
        Harmony compares proportions measured on your photo with published ranges. Camera angle,
        distance, and pose change the numbers, and the ranges are conventions, not a measure of
        worth or a medical diagnosis.
      </p>
    </div>
  );
}
