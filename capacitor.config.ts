import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.menearz.saucerraid",
  appName: "Alien Attack Saucer",
  webDir: "dist",
  backgroundColor: "#090b0e",
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "never",
    scrollEnabled: false,
    preferredContentMode: "mobile",
  },
};

export default config;
