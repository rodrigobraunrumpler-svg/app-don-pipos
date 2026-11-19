import { Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";

// Pedidos llega en la fase 4
export default function Orders() {
  return (
    <Screen bottom={false}>
      <View className="flex-1 px-5 pt-4">
        <Text className="font-extrabold text-3xl text-text">Pedidos</Text>
      </View>
    </Screen>
  );
}
