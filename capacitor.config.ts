import type { CapacitorConfig } from "@capacitor/cli";

const hostedAppUrl = process.env.ASCENDR_APP_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.ascendr.org",
  appName: "Ascendr",
  webDir: "mobile-shell",
  ios: {
    // Let route backgrounds reach the status-bar area. Each mobile surface
    // already applies env(safe-area-inset-*) to its interactive content.
    contentInset: "never",
  },
  ...(hostedAppUrl
    ? {
        server: {
          url: hostedAppUrl,
          cleartext: false,
        },
      }
    : {}),
};

export default config;
