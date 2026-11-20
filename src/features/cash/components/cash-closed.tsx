import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { closedText } from "../rules/difference";
import type { CashCount } from "../schema/cash";

// «Día cerrado» (la maqueta): cómo quedó el último conteo y «Volver a contar» (otro cierre: nada se borra)
export function CashClosed({ count, onRecount }: { count: CashCount; onRecount: () => void }) {
  return (
    <View className="items-center px-5 pt-10">
      <Icon name="check-circle-outline" size={42} tone="olive" />
      <Text className="mt-4 text-center font-extrabold text-xl text-text">Día cerrado</Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">{closedText(count)}</Text>
      <View className="mt-4 w-full">
        <Button
          variant="text"
          label="Volver a contar"
          icon={<Icon name="restore" size={18} tone="accent" />}
          onPress={onRecount}
        />
      </View>
    </View>
  );
}
