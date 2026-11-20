import { Stack } from "expo-router";

import { SetupDraftProvider } from "@/features/businesses";

// La puesta en marcha de la primera vez: sus pasos comparten lo puesto y se deslizan uno sobre otro; «Paso anterior» y
// el botón atrás del celular vuelven de a un paso
export default function SetupLayout() {
  return (
    <SetupDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }} />
    </SetupDraftProvider>
  );
}
