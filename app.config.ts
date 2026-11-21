import type { ExpoConfig } from "expo/config";

// El proyecto en Expo (EAS): lo creó `eas init`. No es un secreto: va dentro de la APK
const EAS_PROJECT_ID = "b29dca10-383e-4a1c-be5f-f6fdf09c6832";

const config: ExpoConfig = {
  name: "Don Pipos",
  slug: "varmar-app",
  // La organización de Expo donde vive el proyecto (EAS)
  owner: "javierfullstacks-team",
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
  extra: { eas: { projectId: EAS_PROJECT_ID } },
  // Las correcciones llegan sin reinstalar la APK (expo-updates), a las que tienen esta misma versión. Cuando cambie
  // algo nativo (una librería nueva), sube `version` y se compila otra APK
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` },
  runtimeVersion: { policy: "appVersion" },
};

export default config;
