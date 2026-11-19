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
              {({ sessionStatus, locked, offerBiometrics, ready: unlockReady }) => {
                // Mientras se sabe si hay sesión: el fondo, unos milisegundos
                if (sessionStatus === "loading" || !unlockReady) return <View className="flex-1 bg-background" />;
                const signedIn = sessionStatus === "signed-in";
                // Sin sesión, Ingresar; con sesión bloqueada, Entrar; recién ingresado, la huella; si no, las pestañas
                return (
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Protected guard={signedIn && !locked && !offerBiometrics}>
                      <Stack.Screen name="(main)" />
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
