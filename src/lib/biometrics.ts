import {
  authenticateAsync,
  getEnrolledLevelAsync,
  hasHardwareAsync,
  isEnrolledAsync,
  SecurityLevel,
} from "expo-local-authentication";

// La huella del celular: hay sensor y una huella registrada de las fuertes. La cara por la cámara de muchos Android es
// «débil» (se engaña con una foto) y no cuenta
export async function biometricsAvailable(): Promise<boolean> {
  return (
    (await hasHardwareAsync()) &&
    (await isEnrolledAsync()) &&
    (await getEnrolledLevelAsync()) >= SecurityLevel.BIOMETRIC_STRONG
  );
}

// Sin el bloqueo del celular como respaldo: si la huella falla, la app pide su propio PIN
export async function confirmWithBiometrics(promptMessage: string, cancelLabel: string): Promise<boolean> {
  const result = await authenticateAsync({
    promptMessage,
    cancelLabel,
    disableDeviceFallback: true,
    biometricsSecurityLevel: "strong",
  });
  return result.success;
}
