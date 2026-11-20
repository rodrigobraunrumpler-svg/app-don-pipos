import { Pressable, Text } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";

import { iconFor } from "../rules/category";

type Props = { name: string; icon: string; selected: boolean; onPress: () => void };

// Un tipo de gasto para elegir, con su ícono
export function CategoryChip({ name, icon, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 flex-row items-center gap-1.5 rounded-full border-[1.5px] px-3.5 ${selected ? "border-primary bg-primary" : "border-border-strong bg-surface"}`}
    >
      <Icon name={iconFor(icon) as IconName} size={18} tone={selected ? "onPrimary" : "olive"} />
      <Text numberOfLines={1} className={`font-bold text-sm ${selected ? "text-on-primary" : "text-text"}`}>
        {name}
      </Text>
    </Pressable>
  );
}
