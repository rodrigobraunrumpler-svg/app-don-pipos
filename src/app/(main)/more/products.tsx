import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ProductList } from "@/features/products";

export default function Products() {
  return (
    <Screen bottom={false}>
      <ProductList onBack={() => router.back()} />
    </Screen>
  );
}
