import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

import { biometricsAvailable, confirmWithBiometrics } from "@/lib/biometrics";
import { hashPin, pinMatches, type StoredPin } from "@/lib/local-pin";

import { AUTO_LOCK_CHOICES, DEFAULT_AUTO_LOCK, MAX_LOCAL_ERRORS, type AutoLockMinutes } from "../constants";
import { signOutMutation } from "../queries/mutations";

export type SessionStatus = "loading" | "signed-in" | "signed-out";
export type UnlockAnswer = { ok: true } | { ok: false; attemptsLeft: number };

// En SecureStore, lo que identifica al dueño en este celular; en AsyncStorage, sus preferencias (no son secretas)
const SECRET = { pin: "auth.local-pin", phone: "auth.phone", errors: "auth.pin-errors" } as const;
const PREFERENCE = { biometrics: "auth.biometrics", autoLock: "auth.auto-lock" } as const;

const readPin = async (): Promise<StoredPin | null> =>
  JSON.parse((await SecureStore.getItemAsync(SECRET.pin)) ?? "null");
const asAutoLock = (value: string | null): AutoLockMinutes =>
  AUTO_LOCK_CHOICES.find((choice) => String(choice) === value) ?? DEFAULT_AUTO_LOCK;

// El candado de la app en este celular: el PIN local, la huella y el bloqueo (docs/spec/auth.md §5)
export function useUnlockState({ sessionStatus }: { sessionStatus: SessionStatus }) {
  const signOut = useMutation(signOutMutation);
  const [ready, setReady] = useState(false);
  // Al abrir la app con una sesión guardada, empieza bloqueada. Sin sesión no hay nada que desbloquear: así, al ingresar,
  // la app no pasa por la pantalla de Entrar
  const [locked, setLocked] = useState(sessionStatus !== "signed-out");
  const [previousStatus, setPreviousStatus] = useState(sessionStatus);
  if (sessionStatus !== previousStatus) {
    setPreviousStatus(sessionStatus);
    if (sessionStatus === "signed-out") setLocked(false);
  }
  const [lockedOut, setLockedOut] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [biometricsEnabled, setBiometrics] = useState(false);
  const [autoLockMinutes, setAutoLock] = useState<AutoLockMinutes>(DEFAULT_AUTO_LOCK);
  const [offerBiometrics, setOfferBiometrics] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      SecureStore.getItemAsync(SECRET.phone),
      AsyncStorage.getItem(PREFERENCE.biometrics),
      AsyncStorage.getItem(PREFERENCE.autoLock),
    ]).then(([storedPhone, biometrics, autoLock]) => {
      if (cancelled) return;
      setPhone(storedPhone);
      setBiometrics(biometrics === "1");
      setAutoLock(asAutoLock(autoLock));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function forget(): Promise<void> {
    await Promise.all(Object.values(SECRET).map((key) => SecureStore.deleteItemAsync(key)));
    setPhone(null);
  }

  async function rememberPin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(SECRET.pin, JSON.stringify(await hashPin(pin)));
    await SecureStore.setItemAsync(SECRET.errors, "0");
  }

  async function rememberSignIn(signedInPhone: string, pin: string): Promise<void> {
    await rememberPin(pin);
    await SecureStore.setItemAsync(SECRET.phone, signedInPhone);
    // Antes de desbloquear: así la app va directo a ofrecer la huella, si el celular la tiene
    setOfferBiometrics(!biometricsEnabled && (await biometricsAvailable()));
    setPhone(signedInPhone);
    setLockedOut(false);
    setLocked(false);
  }

  async function answerBiometricsOffer(accept: boolean): Promise<void> {
    if (accept) await setBiometricsEnabled(true);
    setOfferBiometrics(false);
  }

  async function signOutHere(): Promise<void> {
    await forget();
    await signOut.mutateAsync();
  }

  async function unlockWithPin(pin: string): Promise<UnlockAnswer> {
    const stored = await readPin();
    if (stored && (await pinMatches(pin, stored))) {
      await SecureStore.setItemAsync(SECRET.errors, "0");
      setLocked(false);
      return { ok: true };
    }
    // Sin PIN guardado no hay cómo entrar sin internet: cuenta como si se acabaran los intentos
    const errors = stored ? Number((await SecureStore.getItemAsync(SECRET.errors)) ?? "0") + 1 : MAX_LOCAL_ERRORS;
    if (errors >= MAX_LOCAL_ERRORS) {
      setLockedOut(true);
      await signOutHere();
      return { ok: false, attemptsLeft: 0 };
    }
    await SecureStore.setItemAsync(SECRET.errors, String(errors));
    return { ok: false, attemptsLeft: MAX_LOCAL_ERRORS - errors };
  }

  async function unlockWithBiometrics(): Promise<boolean> {
    if (!biometricsEnabled || !(await biometricsAvailable())) return false;
    const confirmed = await confirmWithBiometrics("Entra a Don Pipos", "Usar mi PIN");
    if (confirmed) {
      await SecureStore.setItemAsync(SECRET.errors, "0");
      setLocked(false);
    }
    return confirmed;
  }

  // Solo se activa si el celular tiene sensor y una huella registrada
  async function setBiometricsEnabled(enabled: boolean): Promise<boolean> {
    if (enabled && !(await biometricsAvailable())) return false;
    await AsyncStorage.setItem(PREFERENCE.biometrics, enabled ? "1" : "0");
    setBiometrics(enabled);
    return true;
  }

  async function setAutoLockMinutes(minutes: AutoLockMinutes): Promise<void> {
    await AsyncStorage.setItem(PREFERENCE.autoLock, String(minutes));
    setAutoLock(minutes);
  }

  return {
    ready,
    locked,
    lockedOut,
    phone,
    biometricsEnabled,
    autoLockMinutes,
    offerBiometrics,
    rememberSignIn,
    answerBiometricsOffer,
    rememberPin,
    unlockWithPin,
    unlockWithBiometrics,
    setBiometricsEnabled,
    setAutoLockMinutes,
    signOutHere,
    lock: () => setLocked(true),
    dismissLockedOut: () => setLockedOut(false),
  };
}

export type UnlockState = ReturnType<typeof useUnlockState>;
