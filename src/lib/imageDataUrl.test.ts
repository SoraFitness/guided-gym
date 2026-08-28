import { describe, expect, it } from "vitest";
import { imageDataUrlToBlob } from "./imageDataUrl";

describe("imageDataUrlToBlob", () => {
  it("decodes image data locally without a fetch request", async () => {
    const blob = imageDataUrlToBlob("data:image/jpeg;base64,aGVsbG8=");

    expect(blob.type).toBe("image/jpeg");
    expect(await blob.text()).toBe("hello");
  });

  it("rejects invalid image data", () => {
    expect(() => imageDataUrlToBlob("not-an-image")).toThrow("selected photo");
  });
});
