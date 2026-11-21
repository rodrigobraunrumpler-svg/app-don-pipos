import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ProductPreview, useProductDraft } from "@/features/products";

// «Así se verá en la web»: «Publicar» guarda y vuelve a la lista; «Seguir editando» vuelve al alfajor
export default function PreviewProduct() {
  const { finish } = useProductDraft();
  return (
    <Screen>
      <ProductPreview
        onBack={() => router.back()}
        onSaved={(product, published) => {
          finish(product, published);
          router.dismissTo("/settings/products");
        }}
      />
    </Screen>
  );
}
