import { Text, View } from "react-native";

import { Screen } from "@/components/ui/screen";

// Stock llega en la fase 3
export default function Stock() {
  return (
    <Screen bottom={false}>
      <View className="flex-1 px-5 pt-4">
        <Text className="font-extrabold text-3xl text-text">Stock</Text>
      </View>
    </Screen>
  );
}
