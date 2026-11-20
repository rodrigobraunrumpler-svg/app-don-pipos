import config from "./app.config";

// La caché guardada tiene datos de los clientes: no debe salir del celular en la copia de seguridad de Google
test("la copia de seguridad de Android está apagada", () => {
  expect(config.android?.allowBackup).toBe(false);
});

// La cámara se pide para la foto de la boleta, con el motivo en español; la galería y el micrófono no
test("el permiso de la cámara dice para qué es", () => {
  expect(config.plugins).toContainEqual([
    "expo-image-picker",
    {
      cameraPermission: "La cámara se usa para tomar la foto de la boleta de un gasto.",
      photosPermission: false,
      microphonePermission: false,
    },
  ]);
});
