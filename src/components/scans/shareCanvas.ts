// Canvas renderer for the shareable Body / Face Scan cards. Both reports export
// the same layout: a photo card carrying the overall score, then a colour-coded
// breakdown, then the Ascendr watermark.

import { drawAscendrWatermark, watermarkHeight, type WatermarkVariant } from "./shareWatermark";

const WIDTH = 1080;
const HEIGHT = 1350;
const BACKGROUND = "#0b0b0d";
const CARD = "#17171b";

// sRGB equivalents of the --score-* tokens; canvas cannot read CSS variables.
const TONE = { high: "#3fd28f", mid: "#f2b544", low: "#f0685a" } as const;
const NEON = "#b4f43e";

export function canvasToneColor(score: number | null) {
  if (score == null) return "rgba(255,255,255,0.35)";
  if (score >= 70) return TONE.high;
  if (score >= 50) return TONE.mid;
  return TONE.low;
}

export interface ShareCardInput {
  photo: string;
  /** "Your Body Score" */
  title: string;
  /** "OVERALL PHYSIQUE SCORE" */
  scoreLabel: string;
  score: number;
  chips: string[];
  metrics: { label: string; score: number | null }[];
  createdAt?: string | null;
  /** How the photo fills its card: faces are kept whole, bodies fill the frame. */
  photoFit?: "cover" | "contain";
  watermark?: WatermarkVariant;
  disclaimer: string;
  marketingHeadline: string;
  marketingDisclaimer: string;
}

export async function createScoreShareImage(input: ShareCardInput) {
  const watermark = input.watermark ?? "standard";
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = context.createRadialGradient(WIDTH * 0.85, 0, 0, WIDTH * 0.85, 0, 700);
  glow.addColorStop(0, "rgba(166,255,64,0.16)");
  glow.addColorStop(1, "rgba(166,255,64,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Header
  context.fillStyle = "#ffffff";
  context.font = "800 42px Arial, sans-serif";
  context.fillText(input.title, 64, 102);
  context.fillStyle = "rgba(255,255,255,0.5)";
  context.font = "700 24px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(
    new Date(input.createdAt ?? Date.now()).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    WIDTH - 64,
    100,
  );
  context.textAlign = "left";

  // Photo card
  const card = { x: 60, y: 140, w: 960, h: 680, r: 44 };
  const image = await loadCanvasImage(input.photo);
  const cut = 70;
  context.save();
  chamferRect(context, card.x, card.y, card.w, card.h, card.r, cut);
  context.clip();
  context.fillStyle = CARD;
  context.fillRect(card.x, card.y, card.w, card.h);
  if (input.photoFit === "contain") {
    drawFit(context, image, card.x, card.y, card.w, card.h, "contain");
  } else {
    drawFit(context, image, card.x, card.y, card.w, card.h, "cover");
  }
  const shade = context.createLinearGradient(0, card.y, 0, card.y + card.h);
  shade.addColorStop(0, "rgba(0,0,0,0.05)");
  shade.addColorStop(0.45, "rgba(0,0,0,0.12)");
  shade.addColorStop(0.75, "rgba(0,0,0,0.62)");
  shade.addColorStop(1, "rgba(0,0,0,0.88)");
  context.fillStyle = shade;
  context.fillRect(card.x, card.y, card.w, card.h);
  context.restore();
  context.strokeStyle = "rgba(255,255,255,0.1)";
  context.lineWidth = 2;
  chamferRect(context, card.x, card.y, card.w, card.h, card.r, cut);
  context.stroke();

  // The lit bevel on the cut corner: Ascendr's signature edge.
  context.save();
  context.strokeStyle = NEON;
  context.lineWidth = 6;
  context.lineCap = "round";
  context.shadowColor = NEON;
  context.shadowBlur = 18;
  context.beginPath();
  context.moveTo(card.x + card.w - cut, card.y);
  context.lineTo(card.x + card.w, card.y + cut);
  context.stroke();
  context.restore();

  // Vision tag
  context.fillStyle = "rgba(0,0,0,0.6)";
  roundedRect(context, card.x + 36, card.y + 36, 300, 50, 12);
  context.fill();
  context.fillStyle = NEON;
  context.beginPath();
  context.moveTo(card.x + 62, card.y + 50);
  context.lineTo(card.x + 72, card.y + 70);
  context.lineTo(card.x + 52, card.y + 70);
  context.closePath();
  context.fill();
  context.font = "800 21px Arial, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("ASCENDR VISION", card.x + 86, card.y + 69);
  context.letterSpacing = "0px";

  context.fillStyle = "rgba(255,255,255,0.78)";
  context.font = "800 22px Arial, sans-serif";
  context.letterSpacing = "4px";
  context.fillText(input.scoreLabel.toUpperCase(), 104, 600);
  context.letterSpacing = "0px";

  const scoreText = String(Math.round(input.score));
  context.fillStyle = canvasToneColor(input.score);
  context.font = "900 176px Arial, sans-serif";
  context.letterSpacing = "-6px";
  context.fillText(scoreText, 92, 740);
  const scoreWidth = context.measureText(scoreText).width;
  context.letterSpacing = "0px";
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.font = "800 44px Arial, sans-serif";
  context.fillText("/100", 104 + scoreWidth, 738);

  let chipX = 104;
  context.font = "800 24px Arial, sans-serif";
  for (const chip of input.chips.slice(0, 3)) {
    const chipWidth = context.measureText(chip).width + 44;
    if (chipX + chipWidth > card.x + card.w - 40) break;
    context.fillStyle = "rgba(0,0,0,0.5)";
    roundedRect(context, chipX, 760, chipWidth, 44, 12);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.24)";
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = "#ffffff";
    context.fillText(chip, chipX + 22, 790);
    chipX += chipWidth + 12;
  }

  // Breakdown
  const panel = { x: 60, y: 845, w: 960, h: 350 };
  context.fillStyle = CARD;
  roundedRect(context, panel.x, panel.y, panel.w, panel.h, 40);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.07)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "800 34px Arial, sans-serif";
  context.fillText("Breakdown", 100, 905);

  input.metrics.slice(0, 6).forEach((metric, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 100 + column * 470;
    const y = 970 + row * 82;
    const barWidth = 410;
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "700 27px Arial, sans-serif";
    context.fillText(truncateCanvasText(context, metric.label, 300), x, y);
    context.fillStyle = canvasToneColor(metric.score);
    context.font = "900 32px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(metric.score == null ? "—" : String(metric.score), x + barWidth, y);
    context.textAlign = "left";
    // Ten level blocks, matching the in-app meters.
    const blocks = 10;
    const gap = 6;
    const blockWidth = (barWidth - gap * (blocks - 1)) / blocks;
    const filled = metric.score == null ? 0 : (metric.score / 100) * blocks;
    for (let block = 0; block < blocks; block++) {
      const bx = x + block * (blockWidth + gap);
      context.fillStyle = "rgba(255,255,255,0.1)";
      roundedRect(context, bx, y + 18, blockWidth, 12, 4);
      context.fill();
      const fill = Math.max(0, Math.min(1, filled - block));
      if (fill > 0) {
        context.fillStyle = canvasToneColor(metric.score);
        roundedRect(context, bx, y + 18, Math.max(5, blockWidth * fill), 12, 4);
        context.fill();
      }
    }
  });

  if (watermark === "standard") {
    await drawAscendrWatermark(context, { disclaimer: input.disclaimer });
    return await canvasToPng(canvas);
  }

  // Marketing export: crop below the breakdown and append a much larger brand
  // band, so a post reads as an advert for the app.
  const cropHeight = 1214;
  const bandHeight = watermarkHeight("marketing") + 46;
  const marketing = document.createElement("canvas");
  marketing.width = WIDTH;
  marketing.height = cropHeight + bandHeight;
  const marketingContext = marketing.getContext("2d");
  if (!marketingContext) throw new Error("Canvas is unavailable");
  marketingContext.fillStyle = BACKGROUND;
  marketingContext.fillRect(0, 0, marketing.width, marketing.height);
  marketingContext.drawImage(canvas, 0, 0, WIDTH, cropHeight, 0, 0, WIDTH, cropHeight);
  await drawAscendrWatermark(marketingContext, {
    variant: "marketing",
    headline: input.marketingHeadline,
    disclaimer: input.marketingDisclaimer,
  });
  return await canvasToPng(marketing);
}

/** Shares the card through the system sheet, or downloads it where sharing files is unsupported. */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  mode: "share" | "save",
  shareText: { title: string; text: string },
) {
  if (mode === "share") {
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ ...shareText, files: [file] });
      return "shared" as const;
    }
  }
  downloadBlob(blob, filename);
  return "downloaded" as const;
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))),
      "image/png",
      0.94,
    );
  });
}

async function loadCanvasImage(source: string) {
  let objectUrl: string | null = null;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error("Could not load scan photo");
    objectUrl = URL.createObjectURL(await response.blob());
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode scan photo"));
      image.src = objectUrl!;
    });
  } finally {
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 1_000);
  }
}

function drawFit(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  fit: "cover" | "contain",
) {
  const ratio =
    fit === "cover"
      ? Math.max(width / image.naturalWidth, height / image.naturalHeight)
      : Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * ratio;
  const drawHeight = image.naturalHeight * ratio;
  // Bodies anchor to the top so heads are never cropped; faces stay centred.
  const offsetY =
    fit === "cover" ? Math.min(0, (height - drawHeight) * 0.15) : (height - drawHeight) / 2;
  context.drawImage(image, x + (width - drawWidth) / 2, y + offsetY, drawWidth, drawHeight);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function truncateCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let next = value;
  while (next.length > 1 && context.measureText(`${next}…`).width > maxWidth)
    next = next.slice(0, -1);
  return `${next.trim()}…`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Rounded rectangle with its top-right corner cut at 45 degrees. */
function chamferRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  cut: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - cut, y);
  context.lineTo(x + width, y + cut);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
