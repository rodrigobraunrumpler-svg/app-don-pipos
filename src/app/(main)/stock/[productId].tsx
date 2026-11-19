import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { productsQuery } from "@/features/products";
import { ProductStock } from "@/features/stock";

// Un alfajor: la pantalla une el precio (productos) con su stock y sus movimientos (stock)
export default function ProductStockScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { data: price } = useQuery({
    ...productsQuery,
    select: (products) => products.find((product) => product.id === productId)?.priceCents,
  });
  return (
    <Screen bottom={false}>
      <ProductStock productId={productId} price={price} onBack={() => router.back()} />
    </Screen>
  );
}
