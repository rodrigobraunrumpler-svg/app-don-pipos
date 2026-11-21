import { Pressable, Text } from "react-native";

import { Icon, type IconName } from "./icon";

type Props = { icon: IconName; label: string; value?: string | null; onPress: () => void };

// Una fila de menú (Ajustes y los atajos de Stock, Gastos y Clientes): su ícono, su nombre y, a la derecha, lo que vale ahora (cuánto, cuántos o «Hoy»). El valor nunca se
// corta; el nombre sí, con «…»
export function MenuRow({ icon, label, value, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      className="min-h-[54px] flex-row items-center gap-3 border-b border-border px-4"
    >
      <Icon name={icon} size={20} tone="olive" />
      <Text numberOfLines={1} className="flex-1 font-semibold text-base text-text">
        {label}
      </Text>
      {value ? <Text className="shrink-0 text-sm text-text-secondary">{value}</Text> : null}
      <Icon name="chevron-right" size={20} tone="textMuted" />
    </Pressable>
  );
}
