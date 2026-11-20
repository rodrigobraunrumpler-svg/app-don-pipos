import { Pressable } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";

type Props = { icon: string; label: string; selected: boolean; onPress: () => void };

// Un ícono para elegir en un tipo de gasto (el lector de pantalla dice «Ícono: empaques»)
export function IconChoice({ icon, label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ícono: ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`h-12 w-12 items-center justify-center rounded-full border-[1.5px] ${selected ? "border-primary bg-primary" : "border-border-strong bg-surface"}`}
    >
      <Icon name={icon as IconName} size={22} tone={selected ? "onPrimary" : "text"} />
    </Pressable>
  );
}
