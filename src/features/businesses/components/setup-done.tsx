import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { useFinishSetup } from "../hooks/use-finish-setup";

// «Todo listo» (la maqueta). «Ir a Inicio» marca la puesta en marcha como hecha: la puerta del layout raíz lleva a
// Inicio, con el consejo de la primera vez
export function SetupDone() {
  const finish = useFinishSetup();
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Icon name="check-circle-outline" size={64} tone="olive" />
      <Text accessibilityRole="header" className="font-extrabold text-2xl text-text">
        Todo listo
      </Text>
      <Text className="pb-3 text-center text-base text-text-secondary">
        Ya puedes anotar tu primer pedido. Lo que cargaste se cambia cuando quieras en Ajustes.
      </Text>
      <Button
        label="Ir a Inicio"
        icon={<Icon name="home-outline" size={20} tone="onPrimary" />}
        onPress={() => void finish()}
      />
    </View>
  );
}
