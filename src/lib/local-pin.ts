import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from "expo-crypto";

// El PIN del celular, para entrar sin internet: se guarda solo su hash SHA-256 con una sal al azar (docs/spec/auth.md §5)
export type StoredPin = { hash: string; salt: string };

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function hashPin(pin: string, salt: string = toHex(getRandomBytes(16))): Promise<StoredPin> {
  return { hash: await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`), salt };
}

export async function pinMatches(pin: string, stored: StoredPin): Promise<boolean> {
  return (await hashPin(pin, stored.salt)).hash === stored.hash;
}
