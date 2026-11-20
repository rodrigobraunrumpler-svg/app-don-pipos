import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { useOnline } from "@/lib/use-online";

import { useSaveSettings } from "../hooks/use-save-settings";
import { businessQuery } from "../queries/business";
import { productionNote } from "../rules/settings-labels";

// Más → Producción: cada cuántos días produce (de 1 a 14). Inicio y Stock sugieren para ese periodo
export function ProductionSheet({ onClose }: { onClose: () => void }) {
  const online = useOnline();
  const settings = useQuery(businessQuery).data?.settings;
  const { save, saving, failure } = useSaveSettings();
  const [edited, setEdited] = useState<number | null>(null);
  const days = edited ?? settings?.productionIntervalDays;

  async function submit() {
    if (days !== undefined && (await save({ productionIntervalDays: days }))) onClose();
  }

  return (
    <Sheet visible title="Producción" onClose={onClose}>
      <Text className="text-sm text-text-secondary">La sugerencia cubre los días hasta tu siguiente tanda.</Text>
      {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
      {days === undefined ? (
        <SkeletonRows rows={2} />
      ) : (
        <View className="gap-3 pb-2 pt-4">
          <View className="flex-row items-center gap-3">
            <Text numberOfLines={1} className="flex-1 font-bold text-base text-text">
              Produces cada
            </Text>
            <Stepper value={days} onChange={setEdited} label="días entre producciones" min={1} max={14} />
          </View>
          <View className="flex-row gap-2.5 rounded-md bg-sunken px-4 py-3">
            <Icon name="information-outline" size={18} tone="textSecondary" />
            <Text className="flex-1 text-sm text-text">{productionNote(days)}</Text>
          </View>
          {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
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
