import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "xyz.nuroctane.blackjack",
  appName: "Digital Sea Blackjack",
  webDir: "out",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#070B14",
  },
  android: {
    backgroundColor: "#070B14",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#070B14",
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#070B14",
    },
  },
};

export default config;
