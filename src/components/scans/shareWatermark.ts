// Marketing watermark drawn onto exported scan cards, so a shared Body or Face
// Scan always carries the app's name and where to get it.
//
// Apple requires their own unmodified "Download on the App Store" badge and
// forbids redrawing the Apple mark, so this never draws one. Drop the official
// badge artwork at public/media/app-store-badge.png and it is used
// automatically; until then a neutral text pill is drawn instead.

const ASCENDR_LOGO_SRC = "/media/ascendr-logo.png";
const APP_STORE_BADGE_SRC = "/media/app-store-badge.png";

const NEON = "#a6ff40";

/** "marketing" is the oversized band used on cards posted publicly. */
export type WatermarkVariant = "standard" | "marketing";

const VARIANT_SCALE: Record<WatermarkVariant, number> = {
  standard: 1,
  marketing: 1.62,
};

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Resolves null instead of throwing, so a missing asset never breaks an export. */
function loadOptionalImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
}

function pathRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safe = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safe, y);
  context.arcTo(x + width, y, x + width, y + height, safe);
  context.arcTo(x + width, y + height, x, y + height, safe);
  context.arcTo(x, y + height, x, y, safe);
  context.arcTo(x, y, x + width, y, safe);
  context.closePath();
}

export interface AscendrWatermarkOptions {
  /** Small print drawn inside the strip, under the tagline. */
  disclaimer?: string;
  /** Card padding either side. Defaults to the scan cards' 70px gutter. */
  gutter?: number;
  /** Distance from the bottom of the canvas to the strip. */
  bottomMargin?: number;
  variant?: WatermarkVariant;
  /** Extra line above the wordmark, used by the marketing band. */
  headline?: string;
}

/** Height the strip will occupy, so callers can size a canvas for it. */
export function watermarkHeight(variant: WatermarkVariant = "standard") {
  return variant === "marketing" ? 210 : 112;
}

/**
 * Draws the Ascendr brand strip across the bottom of an export canvas.
 * Call it last so it sits above the card's gradients.
 */
export async function drawAscendrWatermark(
  context: CanvasRenderingContext2D,
  options: AscendrWatermarkOptions = {},
) {
  const variant = options.variant ?? "standard";
  const scale = VARIANT_SCALE[variant];
  const px = (value: number) => Math.round(value * scale);

  const gutter = options.gutter ?? 70;
  const bottomMargin = options.bottomMargin ?? 22;
  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  const left = gutter;
  const right = canvasWidth - gutter;
  const height = watermarkHeight(variant);
  const top = canvasHeight - bottomMargin - height;

  const [logo, badge] = await Promise.all([
    loadOptionalImage(ASCENDR_LOGO_SRC),
    loadOptionalImage(APP_STORE_BADGE_SRC),
  ]);

  context.save();
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  // Brand strip
  context.fillStyle = "rgba(8, 12, 9, 0.9)";
  pathRoundedRect(context, left, top, right - left, height, px(24));
  context.fill();
  context.strokeStyle = "rgba(166,255,64,0.34)";
  context.lineWidth = variant === "marketing" ? 3 : 2;
  context.stroke();

  const marketing = variant === "marketing";

  // Ascendr logo
  const logoSize = marketing ? 96 : px(74);
  const logoX = left + (marketing ? 26 : px(26));
  const logoY = marketing ? top + 24 : top + (height - logoSize) / 2;
  if (logo) {
    context.save();
    pathRoundedRect(context, logoX, logoY, logoSize, logoSize, px(20));
    context.clip();
    context.drawImage(logo, logoX, logoY, logoSize, logoSize);
    context.restore();
  } else {
    context.fillStyle = NEON;
    pathRoundedRect(context, logoX, logoY, logoSize, logoSize, px(20));
    context.fill();
    context.fillStyle = "#071006";
    context.font = `900 ${Math.round(logoSize * 0.55)}px Arial, sans-serif`;
    context.textAlign = "center";
    context.fillText("A", logoX + logoSize / 2, logoY + logoSize * 0.7);
    context.textAlign = "left";
  }

  const textX = logoX + logoSize + (marketing ? 22 : px(20));

  // The App Store listing name, kept as one exact string so it is searchable
  // verbatim rather than split across lines.
  const appName = "Ascendr: Smart Fitness App";
  const fitFont = (text: string, startSize: number, maxWidth: number, weight: number) => {
    let size = startSize;
    do {
      context.font = `${weight} ${size}px Arial, sans-serif`;
      if (context.measureText(text).width <= maxWidth) break;
      size -= 1;
    } while (size > 11);
    return size;
  };

  if (marketing) {
    // Name gets the full width; the badge sits on the row beneath it.
    const badgeRowHeight = 58;
    const nameMaxWidth = right - 26 - textX;

    context.fillStyle = "rgba(255,255,255,0.55)";
    context.font = "800 19px Arial, sans-serif";
    context.letterSpacing = "3px";
    if (options.headline) context.fillText(options.headline.toUpperCase(), textX, top + 40);

    context.letterSpacing = "0px";
    context.fillStyle = NEON;
    fitFont(appName, 54, nameMaxWidth, 900);
    context.fillText(appName, textX, top + 92);

    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = "700 24px Arial, sans-serif";
    context.fillText("Now available on the App Store", textX, top + 126);

    const badgeY = top + height - 22 - badgeRowHeight;
    let badgeRight = right - 26;
    if (badge && badge.naturalHeight > 0) {
      const ratio = badge.naturalWidth / badge.naturalHeight;
      const badgeWidth = Math.round(badgeRowHeight * ratio);
      context.drawImage(badge, badgeRight - badgeWidth, badgeY, badgeWidth, badgeRowHeight);
      badgeRight -= badgeWidth + 18;
    } else {
      const pillWidth = 320;
      const pillX = badgeRight - pillWidth;
      context.fillStyle = "rgba(255,255,255,0.10)";
      pathRoundedRect(context, pillX, badgeY, pillWidth, badgeRowHeight, badgeRowHeight / 2);
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.24)";
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.textAlign = "center";
      context.font = "800 21px Arial, sans-serif";
      context.fillText("Download on the App Store", pillX + pillWidth / 2, badgeY + 37);
      context.textAlign = "left";
      badgeRight = pillX - 18;
    }

    if (options.disclaimer) {
      context.fillStyle = "rgba(255,255,255,0.34)";
      fitFont(options.disclaimer, 17, Math.max(120, badgeRight - textX), 600);
      context.fillText(options.disclaimer, textX, badgeY + 37);
    }
  } else {
    const reservedBadge = Math.min(px(336), (right - left) * 0.42);
    const textMaxWidth = right - px(26) - reservedBadge - px(28) - textX;

    context.fillStyle = NEON;
    context.letterSpacing = "0px";
    fitFont(appName, px(30), textMaxWidth, 900);
    context.fillText(appName, textX, top + px(46));

    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = `700 ${px(17)}px Arial, sans-serif`;
    context.fillText("Now available on the App Store", textX, top + px(70));
    if (options.disclaimer) {
      context.fillStyle = "rgba(255,255,255,0.32)";
      context.font = `600 ${px(13)}px Arial, sans-serif`;
      context.fillText(options.disclaimer, textX, top + px(92));
    }

    if (badge && badge.naturalHeight > 0) {
      const ratio = badge.naturalWidth / badge.naturalHeight;
      const badgeHeight = Math.min(px(68), Math.max(36, reservedBadge / ratio));
      const badgeWidth = Math.round(badgeHeight * ratio);
      context.drawImage(
        badge,
        right - px(26) - badgeWidth,
        top + (height - badgeHeight) / 2,
        badgeWidth,
        badgeHeight,
      );
    } else {
      const pillWidth = reservedBadge;
      const pillHeight = px(60);
      const pillX = right - px(26) - pillWidth;
      const pillY = top + (height - pillHeight) / 2;
      context.fillStyle = "rgba(255,255,255,0.10)";
      pathRoundedRect(context, pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.24)";
      context.lineWidth = 1.5;
      context.stroke();
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.textAlign = "center";
      const labelSize = fitFont("Download on the App Store", px(18), pillWidth - px(24), 800);
      context.fillText(
        "Download on the App Store",
        pillX + pillWidth / 2,
        pillY + pillHeight / 2 + labelSize * 0.36,
      );
      context.textAlign = "left";
    }
  }

  context.restore();
  context.letterSpacing = "0px";
  context.textAlign = "left";
}
