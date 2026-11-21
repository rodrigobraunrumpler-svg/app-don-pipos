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
    versionCode: 1,
    // El logo redondo dentro del área segura, sobre el crema de la marca: así lo recorta bien cada lanzador
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#FAF7E9" },
  },
  web: { bundler: "metro" },
  plugins: [
    "expo-router",
    "expo-font",
    ["expo-splash-screen", { image: "./assets/splash-icon.png", imageWidth: 200, backgroundColor: "#354b2e" }],
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
    // Los recordatorios: avisos del propio celular, con «DP» blanco sobre transparente, como pide Android (fase 8). En
    // Expo Go salen con el ícono de Expo Go
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#354b2e" }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
