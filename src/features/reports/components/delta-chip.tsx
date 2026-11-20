import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { ColorName } from "@/theme";

import { delta, type Delta } from "../rules/delta";

const BOX: Record<Delta["tone"], string> = {
  good: "bg-status-ready-bg",
  watch: "bg-warning-soft",
  neutral: "bg-sunken",
};
const TEXT: Record<Delta["tone"], ColorName> = { good: "statusReadyText", watch: "warning", neutral: "textSecondary" };
const TEXT_CLASS: Record<Delta["tone"], string> = {
  good: "text-status-ready-text",
  watch: "text-warning",
  neutral: "text-text-secondary",
};

type Props = { current: number; previous: number; upIsGood: boolean; against: string; onBrand?: boolean };

// «+12 % frente a la semana pasada»: verde si va bien, ámbar si hay que mirarlo. Sobre la tarjeta verde, en crema.
// Sin datos del periodo anterior, nada
export function DeltaChip({ current, previous, upIsGood, against, onBrand = false }: Props) {
  const value = delta(current, previous, upIsGood);
  if (!value) return null;
  const tone: ColorName = onBrand ? "onPrimary" : TEXT[value.tone];
  return (
    <View
      className={`mt-2 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${onBrand ? "bg-primary-deep" : BOX[value.tone]}`}
    >
      <Icon name={current >= previous ? "trending-up" : "trending-down"} size={15} tone={tone} />
      <Text className={`font-bold text-xs ${onBrand ? "text-on-primary" : TEXT_CLASS[value.tone]}`}>
        {`${value.text} frente a ${against}`}
      </Text>
    </View>
  );
}
