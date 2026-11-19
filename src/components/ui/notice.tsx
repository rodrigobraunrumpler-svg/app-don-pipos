import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Icon, type IconName } from "./icon";

// Un aviso de una línea o dos, como «Sin conexión» de la maqueta
export function Notice({ icon = "wifi-off", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <View accessibilityRole="alert" className="mt-3.5 flex-row gap-2.5 rounded-sm bg-text px-3 py-3">
      <Icon name={icon} size={17} tone="background" />
      <Text className="flex-1 font-semibold text-sm text-background">{children}</Text>
    </View>
  );
}
