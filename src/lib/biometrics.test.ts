import * as LocalAuthentication from "expo-local-authentication";

import { biometricsAvailable, confirmWithBiometrics } from "./biometrics";

const auth = jest.mocked(LocalAuthentication);

test("con sensor y una huella registrada, está disponible", async () => {
  expect(await biometricsAvailable()).toBe(true);
});

test("una huella débil (como la cara por la cámara) no cuenta", async () => {
  auth.getEnrolledLevelAsync.mockResolvedValueOnce(auth.SecurityLevel.BIOMETRIC_WEAK);
  expect(await biometricsAvailable()).toBe(false);
});

test("sin sensor o sin huella registrada, no", async () => {
  auth.hasHardwareAsync.mockResolvedValueOnce(false);
  expect(await biometricsAvailable()).toBe(false);
  auth.isEnrolledAsync.mockResolvedValueOnce(false);
  expect(await biometricsAvailable()).toBe(false);
});

test("confirma sin el bloqueo del celular como respaldo", async () => {
  expect(await confirmWithBiometrics("Entra a Don Pipos", "Usar mi PIN")).toBe(true);
  expect(auth.authenticateAsync).toHaveBeenLastCalledWith({
    promptMessage: "Entra a Don Pipos",
    cancelLabel: "Usar mi PIN",
    disableDeviceFallback: true,
    biometricsSecurityLevel: "strong",
  });
});

test("si la huella falla o se cancela, no confirma", async () => {
  auth.authenticateAsync.mockResolvedValueOnce({ success: false, error: "user_cancel" });
  expect(await confirmWithBiometrics("Entra a Don Pipos", "Usar mi PIN")).toBe(false);
});
