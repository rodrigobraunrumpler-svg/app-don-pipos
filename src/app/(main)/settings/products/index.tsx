import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { draftFrom, emptyDraft, ProductList, useProductDraft } from "@/features/products";

// Productos y precios: el borrador del alfajor se arma al abrirlo, antes de pasar a su pantalla
export default function Products() {
  const { start } = useProductDraft();
  return (
    <Screen>
      <ProductList
        onBack={() => router.back()}
        onOpen={(product) => {
          start(draftFrom(product));
          router.navigate({ pathname: "/settings/products/[id]", params: { id: product.id } });
        }}
        onNew={() => {
          start(emptyDraft());
          router.navigate("/settings/products/new");
        }}
        onOrder={() => router.navigate("/settings/products/order")}
      />
    </Screen>
  );
}
