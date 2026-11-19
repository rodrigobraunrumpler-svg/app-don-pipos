import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { createSecureSessionStorage } from "./secure-session-storage";

const SESSION = JSON.stringify({ access_token: "token-de-prueba", refresh_token: "otro-token" });

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("lo que queda en AsyncStorage no es el texto original, y se recupera igual", async () => {
  const storage = createSecureSessionStorage();
  await storage.setItem("sb-sesion", SESSION);
  const stored = await AsyncStorage.getItem("sb-sesion");
  expect(stored).not.toBeNull();
  expect(stored).not.toContain("token-de-prueba");
  expect(await storage.getItem("sb-sesion")).toBe(SESSION);
});

test("sin la llave en SecureStore no hay sesión", async () => {
  const storage = createSecureSessionStorage();
  await storage.setItem("sb-sesion", SESSION);
  await SecureStore.deleteItemAsync("sb-sesion");
  expect(await storage.getItem("sb-sesion")).toBeNull();
});

test("borrar quita la sesión de los dos lados", async () => {
  const storage = createSecureSessionStorage();
  await storage.setItem("sb-sesion", SESSION);
  await storage.removeItem("sb-sesion");
  expect(await AsyncStorage.getItem("sb-sesion")).toBeNull();
  expect(await SecureStore.getItemAsync("sb-sesion")).toBeNull();
});

test("guardar dos veces lo mismo usa una llave nueva cada vez", async () => {
  const storage = createSecureSessionStorage();
  await storage.setItem("sb-sesion", SESSION);
  const first = await AsyncStorage.getItem("sb-sesion");
  await storage.setItem("sb-sesion", SESSION);
  expect(await AsyncStorage.getItem("sb-sesion")).not.toBe(first);
});
