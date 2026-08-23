import { afterEach, describe, expect, it, vi } from "vitest";
import { createClientId } from "./clientId";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createClientId", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates valid UUIDs when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    const first = createClientId();
    const second = createClientId();

    expect(first).toMatch(UUID_V4);
    expect(second).toMatch(UUID_V4);
    expect(second).not.toBe(first);
  });

  it("falls back when a mobile WebView exposes but rejects randomUUID", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new DOMException("Secure context required", "SecurityError");
      },
      getRandomValues: () => {
        throw new DOMException("Unavailable", "SecurityError");
      },
    });

    expect(createClientId()).toMatch(UUID_V4);
  });
});
