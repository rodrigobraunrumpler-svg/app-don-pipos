import { productPhotoMutation } from "./mutations";

// Sin señal la foto espera (no gasta sus reintentos), y una que falló queda un día para «Reintentar las fotos», no los
// 5 minutos de las demás
test("la foto espera la señal y, si falla, se guarda un día", () => {
  expect(productPhotoMutation.networkMode).toBe("online");
  expect(productPhotoMutation.gcTime).toBe(24 * 60 * 60_000);
});
