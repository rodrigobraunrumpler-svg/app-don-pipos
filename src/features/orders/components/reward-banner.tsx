import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/lib/money";

import type { DraftReward } from "../hooks/use-draft-reward";

type Props = { reward: DraftReward; applied: boolean; onApply: () => void; onRemove: () => void };

// «Sofía tiene su premio listo» con «Aplicar» (pedido2 de la maqueta); aplicado, cuánto descuenta y «Quitar»
export function RewardBanner({ reward, applied, onApply, onRemove }: Props) {
  return (
    <View className="mt-3 flex-row items-center gap-3 rounded-md bg-caramel-soft px-4 py-3">
      <Icon name="star" size={22} tone="caramelText" />
      <View className="flex-1">
        <Text className="font-extrabold text-base text-text">
          {applied ? `Premio aplicado: −${formatCents(reward.amountCents)}` : `${reward.name} tiene su premio listo`}
        </Text>
        <Text className="text-[13px] text-text-secondary">
          {applied ? reward.label : `${reward.label}, por completar su tarjeta de sellos`}
        </Text>
      </View>
      <View className="shrink-0">
        {applied ? (
          <Button variant="text" label="Quitar" onPress={onRemove} />
        ) : (
          <Button label="Aplicar" onPress={onApply} />
        )}
      </View>
    </View>
  );
}
