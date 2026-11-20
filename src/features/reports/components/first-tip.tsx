import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useFirstTip } from "@/lib/first-tip";

// El consejo de la primera vez (la maqueta): sale una vez en Inicio, después de la puesta en marcha, sobre un velo y
// justo encima de la barra, donde está el +. «Entendido» lo cierra para siempre
export function FirstTip() {
  const { visible, dismiss } = useFirstTip();
  if (!visible) return null;
  return (
    <View className="absolute inset-0 justify-end">
      <View className="absolute inset-0 bg-text opacity-40" />
      <View accessibilityRole="alert" className="m-4 gap-3 rounded-lg bg-background p-4">
        <Text className="text-base text-text">
          <Text className="font-extrabold">Anota tu primer pedido</Text>
          {"\n"}
          <Text>Toca + abajo: eliges los alfajores, quién los pide y cómo paga.</Text>
        </Text>
        <Button label="Entendido" onPress={dismiss} />
      </View>
    </View>
  );
}
