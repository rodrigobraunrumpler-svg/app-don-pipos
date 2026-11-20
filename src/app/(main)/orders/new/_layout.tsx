import { Stack } from "expo-router";

import { OrderDraftProvider } from "@/features/orders";

// Nuevo pedido: sus pasos comparten el borrador y se deslizan uno sobre otro; la flecha vuelve de a un paso
export default function NewOrderLayout() {
  return (
    <OrderDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }} />
    </OrderDraftProvider>
  );
}
