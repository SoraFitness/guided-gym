export function imageDataUrlToBlob(dataUrl: string): Blob {
  const separatorIndex = dataUrl.indexOf(",");
  if (separatorIndex < 0) throw new Error("The selected photo is invalid.");

  const header = dataUrl.slice(0, separatorIndex);
  const encoded = dataUrl.slice(separatorIndex + 1);
  const mimeType = /^data:(image\/[a-z0-9.+-]+);base64$/i.exec(header)?.[1];
  if (!mimeType || !encoded) throw new Error("Use a JPEG, PNG, or WebP photo.");

  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeType });
  } catch {
    throw new Error("The selected photo could not be prepared.");
  }
}
