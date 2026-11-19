// Lo que toda prueba necesita simulado porque en Jest no hay celular.
// El almacenamiento: lo usa la caché guardada de TanStack Query (src/lib/query.ts)
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// SecureStore en memoria, como el Keystore del celular
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

// expo-crypto con el crypto de Node
jest.mock("expo-crypto", () => {
  const crypto = require("node:crypto");
  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    getRandomBytes: (count) => new Uint8Array(crypto.randomBytes(count)),
    digestStringAsync: async (_algorithm, data) => crypto.createHash("sha256").update(data).digest("hex"),
    randomUUID: () => crypto.randomUUID(),
  };
});

// La huella: por defecto el celular tiene sensor, una huella registrada y la confirma; cada prueba lo cambia si necesita
// La vibración: en Jest no hay motor
jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  notificationAsync: jest.fn(async () => undefined),
}));

jest.mock("expo-local-authentication", () => {
  const SecurityLevel = { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 };
  return {
    SecurityLevel,
    hasHardwareAsync: jest.fn(async () => true),
    isEnrolledAsync: jest.fn(async () => true),
    getEnrolledLevelAsync: jest.fn(async () => SecurityLevel.BIOMETRIC_STRONG),
    authenticateAsync: jest.fn(async () => ({ success: true })),
  };
});

// Las áreas seguras de la pantalla (muesca, barra del sistema): en las pruebas, todas en cero
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
