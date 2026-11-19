import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { productionSavedText } from "../rules/production";

type Props = { total: number; backOnWeb: string[]; undoing: boolean; onSeeStock: () => void; onUndo: () => void };

// Después de guardar: cuánto se sumó, qué vuelve a la web, «Ver stock» y «Deshacer»
export function ProductionSaved({ total, backOnWeb, undoing, onSeeStock, onUndo }: Props) {
  return (
    <View className="items-center px-5 pt-10">
      <Icon name="package-variant-closed-check" size={42} tone="olive" />
      <Text className="mt-4 text-center font-extrabold text-xl text-text">Producción guardada</Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">{productionSavedText(total, backOnWeb)}</Text>
      <View className="mt-5 w-full gap-2">
        <Button
          label="Ver stock"
          icon={<Icon name="package-variant" size={18} tone="onPrimary" />}
          onPress={onSeeStock}
        />
        <Button
          label={undoing ? "Deshaciendo…" : "Deshacer"}
          variant="text"
          icon={<Icon name="undo" size={18} tone="accent" />}
          onPress={onUndo}
          disabled={undoing}
        />
      </View>
    </View>
  );
}
