import type { CapacitorConfig } from "@capacitor/cli";

const hostedAppUrl = process.env.ASCENDR_APP_URL?.trim();

const config: CapacitorConfig = {
  appId: "org.ascendr.fitness",
  appName: "Ascendr",
  webDir: "mobile-shell",
  ios: {
    contentInset: "always",
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
