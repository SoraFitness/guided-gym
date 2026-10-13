// The staff scan tools accept any photo the operator picks, so the payload has
// to be brought under the scan endpoint's limit here rather than by rejecting
// the upload the way the member flow does.

const MAX_PAYLOAD_CHARS = 3_400_000;

const STEPS = [
  [1600, 0.85],
  [1400, 0.8],
  [1100, 0.72],
  [900, 0.65],
  [700, 0.6],
] as const;

export async function shrinkPhotoForScan(dataUrl: string): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("That photo could not be read."));
    element.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  // Step down until the encoded photo fits, so even a huge original goes through.
  for (const [maxSize, quality] of STEPS) {
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL("image/jpeg", quality);
    if (encoded.length <= MAX_PAYLOAD_CHARS) return encoded;
  }
  return canvas.toDataURL("image/jpeg", 0.5);
}
