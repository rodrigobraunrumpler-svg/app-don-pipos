import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { Screen } from "@/components/ui/screen";
import { businessQuery, ProductsBySalesRow } from "@/features/businesses";
import { ProductOrderList, productsQuery } from "@/features/products";

// Ordenar alfajores: arriba «Los más vendidos primero» (businesses); debajo, los ↑↓ (products). Así salen en la web
export default function OrderProducts() {
  const queryClient = useQueryClient();
  const bySales = useQuery(businessQuery).data?.settings.productsBySales ?? false;
  return (
    <Screen>
      <FormHeader title="Ordenar alfajores" subtitle="Así salen en la web" onBack={() => router.back()} />
      <View className="px-5">
        <ProductsBySalesRow
          onChanged={() => void queryClient.invalidateQueries({ queryKey: productsQuery.queryKey })}
        />
      </View>
      <ProductOrderList locked={bySales} onDone={() => router.back()} />
    </Screen>
  );
}
