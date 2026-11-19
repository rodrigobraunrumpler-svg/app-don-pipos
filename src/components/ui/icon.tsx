import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";

import { useTheme, type ColorName } from "@/theme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Un ícono con un color del tema. La propiedad se llama «tone» y no «color»: el lint prohíbe colores escritos a mano
export function Icon({ name, size = 22, tone = "text" }: { name: IconName; size?: number; tone?: ColorName }) {
  const { colors } = useTheme();
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={colors[tone]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
