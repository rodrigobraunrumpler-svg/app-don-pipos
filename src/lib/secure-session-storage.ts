import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";
import { getRandomBytes } from "expo-crypto";
import * as SecureStore from "expo-secure-store";

// El patrón LargeSecureStore de la guía de Supabase para Expo: en cada escritura, una llave AES-256 nueva va en SecureStore
// (cifrado con el Keystore de Android) y la sesión, cifrada con esa llave, en AsyncStorage, porque SecureStore no acepta
// bien valores tan grandes. La llave al azar sale de expo-crypto, que Expo Go ya trae.
export function createSecureSessionStorage() {
  return {
    async getItem(key: string): Promise<string | null> {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) return null;
      const keyHex = await SecureStore.getItemAsync(key);
      if (!keyHex) return null;
      const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    },

    async setItem(key: string, value: string): Promise<void> {
      const encryptionKey = getRandomBytes(32);
      const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
      await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
      await AsyncStorage.setItem(key, aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value))));
    },

    async removeItem(key: string): Promise<void> {
      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key);
    },
  };
}
