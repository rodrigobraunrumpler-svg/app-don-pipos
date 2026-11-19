// Lo que toda prueba necesita simulado porque en Jest no hay celular.
// El almacenamiento: lo usa la caché guardada de TanStack Query (src/lib/query.ts)
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
