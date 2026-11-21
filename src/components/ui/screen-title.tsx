import type { ReactNode } from "react";
import { Text, View } from "react-native";

// El título grande de una pestaña (Pedidos, Reportes), su línea de abajo y, si hace falta, algo debajo (un selector)
export function ScreenTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <View className="px-5 pb-3 pt-4">
      <Text accessibilityRole="header" className="font-extrabold text-3xl text-text">
        {title}
      </Text>
      {subtitle ? <Text className="text-sm text-text-secondary">{subtitle}</Text> : null}
      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}
