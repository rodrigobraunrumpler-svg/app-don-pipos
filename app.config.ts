import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Don Pipos",
  slug: "varmar-app",
  scheme: "donpipos",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  android: {
    package: "pe.varmar.app",
    // La caché guardada tiene datos de los clientes: no va a la copia de seguridad de Google
    allowBackup: false,
    adaptiveIcon: { foregroundImage: "./assets/icon.png", backgroundColor: "#354b2e" },
  },
  web: { bundler: "metro" },
  plugins: [
    "expo-router",
    "expo-font",
    ["expo-splash-screen", { image: "./assets/icon.png", imageWidth: 180, backgroundColor: "#354b2e" }],
    // La sesión cifrada (LargeSecureStore) y la huella; en Expo Go ya vienen, en la APK los agregan estos plugins
    "expo-secure-store",
    "expo-local-authentication",
    // Compartir el archivo de Excel (Exportar)
    "expo-sharing",
    // La foto de la boleta: solo la cámara (ni la galería ni el micrófono)
    [
      "expo-image-picker",
      {
        cameraPermission: "La cámara se usa para tomar la foto de la boleta de un gasto.",
        photosPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
