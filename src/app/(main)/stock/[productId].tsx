import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ProductStock } from "@/features/stock";

export default function ProductStockScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  return (
    <Screen bottom={false}>
      <ProductStock productId={productId} onBack={() => router.back()} />
    </Screen>
  );
}
