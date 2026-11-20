import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

// «Todo listo» (la maqueta). Si ya estaba hecha (otro celular, o una respuesta que se perdió), lo dice: lo de esta vez
// no se guardó. «Ir a Inicio» lo hace la pantalla (useFinishSetup), que también lo hace con el botón atrás
export function SetupDone({ alreadyDone, onHome }: { alreadyDone: boolean; onHome: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Icon name="check-circle-outline" size={64} tone="olive" />
      <Text accessibilityRole="header" className="font-extrabold text-2xl text-text">
        Todo listo
      </Text>
      <Text className="pb-3 text-center text-base text-text-secondary">
        {alreadyDone
          ? "La puesta en marcha ya estaba hecha, así que no se guardó nada nuevo. Si un número del stock no quedó bien, corrígelo en Stock con «Contar stock»."
          : "Ya puedes anotar tu primer pedido. Lo que cargaste se cambia cuando quieras en Ajustes."}
      </Text>
      <Button label="Ir a Inicio" icon={<Icon name="home-outline" size={20} tone="onPrimary" />} onPress={onHome} />
    </View>
  );
}
