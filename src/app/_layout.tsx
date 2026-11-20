import "@/theme/global.css";

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { View } from "react-native";

import { MissingConfig } from "@/components/ui/missing-config";
import { UnlockConsumer, UnlockProvider } from "@/features/auth";
import { SetupGate } from "@/features/businesses";
import { appEnv } from "@/lib/env";
import { createPersistOptions, createQueryClient, setupFocusManager, setupOnlineManager } from "@/lib/query";
import { ThemeProvider } from "@/theme";

SplashScreen.preventAutoHideAsync();

// Uno solo para toda la app, creado fuera del componente
const queryClient = createQueryClient();
const persistOptions = createPersistOptions(Constants.expoConfig?.version ?? "0");
setupOnlineManager();
setupFocusManager();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // Si la letra no carga, la app abre igual con la del sistema: nunca se queda en la pantalla de carga
  const ready = loaded || Boolean(error);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ThemeProvider>
        {appEnv.ok ? (
          <UnlockProvider>
            <UnlockConsumer>
              {({ sessionStatus, signingIn, locked, offerBiometrics, ready: unlockReady }) => {
                // Mientras se sabe si hay sesión: el fondo, unos milisegundos
                if (sessionStatus === "loading" || !unlockReady) return <View className="flex-1 bg-background" />;
                // Un ingreso en curso sigue en Ingresar hasta guardar el PIN local
                const signedIn = sessionStatus === "signed-in" && !signingIn;
                const inside = signedIn && !locked && !offerBiometrics;
                // Sin sesión, Ingresar; con sesión bloqueada, Entrar; recién ingresado, la huella; la primera vez, la
                // puesta en marcha; si no, las pestañas. Mientras se sabe si falta, la entrada espera (el fondo); una
                // recarga del negocio con la app abierta («loading» otra vez) no desarma las pestañas
                return (
                  <SetupGate enabled={signedIn}>
                    {(setup) => (
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
                        <Stack.Protected guard={inside && setup !== "needed"}>
                          <Stack.Screen name="(main)" />
                        </Stack.Protected>
                        <Stack.Protected guard={inside && setup === "needed"}>
                          <Stack.Screen name="setup" />
                        </Stack.Protected>
                        <Stack.Protected guard={signedIn && locked}>
                          <Stack.Screen name="unlock" />
                        </Stack.Protected>
                        <Stack.Protected guard={signedIn && !locked && offerBiometrics}>
                          <Stack.Screen name="biometrics" />
                        </Stack.Protected>
                        <Stack.Protected guard={!signedIn}>
                          <Stack.Screen name="(auth)" />
                        </Stack.Protected>
                      </Stack>
                    )}
                  </SetupGate>
                );
              }}
            </UnlockConsumer>
          </UnlockProvider>
        ) : (
          <MissingConfig problems={appEnv.problems} />
        )}
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
