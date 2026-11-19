import config from "./app.config";

// La caché guardada tiene datos de los clientes: no debe salir del celular en la copia de seguridad de Google
test("la copia de seguridad de Android está apagada", () => {
  expect(config.android?.allowBackup).toBe(false);
});
