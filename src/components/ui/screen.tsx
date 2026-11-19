import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// El fondo de cada pantalla, sin tapar la barra del sistema. En las pestañas, la barra de abajo ya deja su espacio
export function Screen({ children, bottom = true }: { children: ReactNode; bottom?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: bottom ? insets.bottom : 0 }}
    >
      {children}
    </View>
  );
}
