import type { ReactNode } from "react";
import { Text, View } from "react-native";

// Un grupo de filas, con su título si lo tiene («Tu negocio», «Tus clientes»)
export function MenuSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      {title ? (
        <Text accessibilityRole="header" className="px-1 font-extrabold text-sm text-text-secondary">
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-md border border-border bg-surface">{children}</View>
    </View>
  );
}
