import { router, usePreventRemove } from "expo-router";
import { useState } from "react";

import { Screen } from "@/components/ui/screen";
import { DraftDetailsStep } from "@/features/orders";

// Al guardar, el pedido guardado reemplaza todo el recorrido: «Volver» lleva a donde se empezó. Mientras dice
// «Guardando…», atrás espera: si no, la respuesta tardía reemplazaba la pantalla que estuviera delante
export default function NewOrderDetails() {
  const [saving, setSaving] = useState(false);
  usePreventRemove(saving, () => undefined);
  return (
    <Screen>
      <DraftDetailsStep
        onBack={() => router.back()}
        onSaving={setSaving}
        onSaved={(order) => router.replace({ pathname: "/orders/saved/[id]", params: { id: order.id } })}
      />
    </Screen>
  );
}
