import { Pressable } from "react-native";

import { Icon, type IconName } from "./icon";

// Un botón que es solo un ícono (el ⚙ de Inicio), con su nombre para el lector de pantalla
export function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center"
    >
      <Icon name={icon} size={24} />
    </Pressable>
  );
}
