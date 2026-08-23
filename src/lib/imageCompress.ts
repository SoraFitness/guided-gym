// Browser-side image compression — resizes to fit within maxDim and re-encodes as JPEG.
export async function compressImage(file: File, maxDim = 1600, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  let width: number;
  let height: number;
  let source: CanvasImageSource;

  if (bitmap) {
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } else {
    // Fallback for browsers/iOS HEIC issues — use <img>
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = URL.createObjectURL(file);
    });
    width = img.naturalWidth;
    height = img.naturalHeight;
    source = img;
  }

  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(source, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compress failed"))),
      "image/jpeg",
      quality,
    );
  });
}
