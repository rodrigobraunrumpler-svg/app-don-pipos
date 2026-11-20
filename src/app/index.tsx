import { Redirect } from "expo-router";
import { View } from "react-native";

import { useUnlock } from "@/features/auth";
import { useSetupState } from "@/features/businesses";

// La entrada de la app («/»), sin protección: lleva a donde corresponde según la sesión, el candado y la puesta en
// marcha. Cuando una pantalla queda protegida (se cerró la sesión, se bloqueó, se terminó la puesta en marcha),
// Expo Router vuelve aquí
export default function Entry() {
  const { sessionStatus, signingIn, locked, offerBiometrics } = useUnlock();
  const signedIn = sessionStatus === "signed-in" && !signingIn;
  const setup = useSetupState(signedIn);
  if (!signedIn) return <Redirect href="/sign-in" />;
  if (locked) return <Redirect href="/unlock" />;
  if (offerBiometrics) return <Redirect href="/biometrics" />;
  // Mientras se sabe si falta la puesta en marcha (el primer ingreso, un instante): el fondo
  if (setup === "loading") return <View className="flex-1 bg-background" />;
  if (setup === "needed") return <Redirect href="/setup" />;
  return <Redirect href="/home" />;
}
