import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";

// Pantalla de paso: llega con la tarea 9 de la fase 4a
export default function Placeholder() {
  return (
    <Screen bottom={false}>
      <View className="flex-1 gap-4 px-5 pt-4">
        <Text className="font-extrabold text-3xl text-text">Nuevo pedido</Text>
        <Button variant="secondary" label="Volver" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
