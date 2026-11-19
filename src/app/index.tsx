import { Redirect } from "expo-router";

import { useUnlock } from "@/features/auth";

// La entrada de la app («/»), sin protección: lleva a donde corresponde según la sesión y el candado.
// Cuando una pantalla queda protegida (se cerró la sesión, se bloqueó), Expo Router vuelve aquí
export default function Entry() {
  const { sessionStatus, locked, offerBiometrics } = useUnlock();
  if (sessionStatus !== "signed-in") return <Redirect href="/sign-in" />;
  if (locked) return <Redirect href="/unlock" />;
  if (offerBiometrics) return <Redirect href="/biometrics" />;
  return <Redirect href="/home" />;
}
