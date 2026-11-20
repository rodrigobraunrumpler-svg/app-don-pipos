import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { MAX_DELIVERY_FEE_CENTS } from "../constants";
import { useSaveSettings } from "../hooks/use-save-settings";
import { businessQuery } from "../queries/business";
import { deliveryLabel } from "../rules/settings-labels";

// Más → Delivery: lo que se cobra por llevar un pedido. La zona de reparto no se pide hasta que algo la use (fase 7b)
export function DeliverySheet({ onClose }: { onClose: () => void }) {
  const online = useOnline();
  const settings = useQuery(businessQuery).data?.settings;
  const { save, saving, failure, conflict } = useSaveSettings();
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? (settings ? (settings.deliveryFeeCents / 100).toFixed(2) : "");
  const cents = parseSoles(text);
  const tooMuch = cents !== null && cents > MAX_DELIVERY_FEE_CENTS;

  async function submit() {
    if (cents !== null && !tooMuch && (await save({ deliveryFeeCents: cents }))) onClose();
  }

  return (
    <Sheet visible title="Delivery" onClose={onClose}>
      <Text className="text-sm text-text-secondary">
        Lo que cobras por llevar un pedido. Se suma solo al elegir delivery.
      </Text>
      {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
      <View className="gap-3 pb-2 pt-4">
        <Text className="font-bold text-sm text-text-secondary">Costo</Text>
        <MoneyInput label="Costo" value={text} onChangeText={setEdited} />
        {tooMuch ? (
          <Text className="text-sm text-danger">{`Hasta ${formatCents(MAX_DELIVERY_FEE_CENTS)}.`}</Text>
        ) : null}
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        {conflict && settings ? (
          <Text className="text-sm text-text">{`Lo guardado ahora: ${deliveryLabel(settings.deliveryFeeCents)}`}</Text>
        ) : null}
        <Button
          label={saving ? "Guardando…" : "Guardar"}
          disabled={!online || saving || !settings || cents === null || tooMuch}
          onPress={() => void submit()}
        />
      </View>
    </Sheet>
  );
}
