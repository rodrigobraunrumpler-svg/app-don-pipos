import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { useOnline } from "@/lib/use-online";

import { useSaveSettings } from "../hooks/use-save-settings";
import { businessQuery } from "../queries/business";
import { lapsedLabel } from "../rules/settings-labels";

// Clientes que no vuelven (Ajustes y Pedidos › Clientes): a partir de cuántos días sin pedir (de 7 a 120) un cliente sale en «No vuelven»
export function LapsedSheet({ onClose }: { onClose: () => void }) {
  const online = useOnline();
  const settings = useQuery(businessQuery).data?.settings;
  const { save, saving, failure, conflict } = useSaveSettings();
  const [edited, setEdited] = useState<number | null>(null);
  const days = edited ?? settings?.lapsedAfterDays;

  async function submit() {
    if (days !== undefined && (await save({ lapsedAfterDays: days }))) onClose();
  }

  return (
    <Sheet visible title="Clientes que no vuelven" onClose={onClose}>
      {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
      {days === undefined ? (
        <SkeletonRows rows={2} />
      ) : (
        <View className="gap-3 pb-2">
          <Text className="text-sm text-text-secondary">{`Si un cliente no pide en ${days} días, sale en «No vuelven».`}</Text>
          <View className="flex-row items-center gap-3">
            <Text numberOfLines={1} className="flex-1 font-bold text-base text-text">
              Días sin pedir
            </Text>
            <Stepper value={days} onChange={setEdited} label="días sin pedir" min={7} max={120} />
          </View>
          {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
          {conflict && settings ? (
            <Text className="text-sm text-text">{`Lo guardado ahora: ${lapsedLabel(settings.lapsedAfterDays)}`}</Text>
          ) : null}
          <Button
            label={saving ? "Guardando…" : "Guardar"}
            disabled={!online || saving}
            onPress={() => void submit()}
          />
        </View>
      )}
    </Sheet>
  );
}
