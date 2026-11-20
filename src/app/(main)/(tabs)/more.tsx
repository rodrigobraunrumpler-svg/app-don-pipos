import { router } from "expo-router";
import { ScrollView, Text } from "react-native";

import { Screen } from "@/components/ui/screen";
import { AccountSection } from "@/features/auth";
import { ProductsLink } from "@/features/products";

export default function More() {
  return (
    <Screen bottom={false}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-4">
        <Text className="font-extrabold text-3xl text-text">Más</Text>
        <ProductsLink onPress={() => router.navigate("/more/products")} />
        <AccountSection onChangePin={() => router.navigate("/more/change-pin")} />
      </ScrollView>
    </Screen>
  );
}
