import { authenticateAsync, hasHardwareAsync, isEnrolledAsync } from "expo-local-authentication";

// La huella del celular: hay sensor y al menos una huella registrada
export async function biometricsAvailable(): Promise<boolean> {
  return (await hasHardwareAsync()) && (await isEnrolledAsync());
}

// Sin el bloqueo del celular como respaldo: si la huella falla, la app pide su propio PIN
export async function confirmWithBiometrics(promptMessage: string, cancelLabel: string): Promise<boolean> {
  const result = await authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: true });
  return result.success;
}
