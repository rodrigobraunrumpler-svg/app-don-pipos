import type { ReactNode } from "react";
import { Text, View } from "react-native";

// Una parte de un formulario con su título (Cliente, Entrega, Pago)
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-5 gap-2.5">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        {title}
      </Text>
      {children}
    </View>
  );
}
