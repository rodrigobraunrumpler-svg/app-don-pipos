import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { DraftDetailsStep } from "@/features/orders";

// Al guardar, el pedido guardado reemplaza todo el recorrido: «Volver» lleva a donde se empezó
export default function NewOrderDetails() {
  return (
    <Screen>
      <DraftDetailsStep
        onBack={() => router.back()}
        onSaved={(order) => router.replace({ pathname: "/orders/saved/[id]", params: { id: order.id } })}
      />
    </Screen>
  );
}
