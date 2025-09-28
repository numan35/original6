// project/app.config.ts
import { ExpoConfig } from "expo/config";

export default (): ExpoConfig => ({
  name: "JasonApp",
  slug: "jason-app",
  scheme: "jasonapp",
  plugins: [
    // Enable device location
    "expo-location",
  ],
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "We use your location to find nearby restaurants and improve reservation suggestions.",
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF",
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
    ],
  },
});
