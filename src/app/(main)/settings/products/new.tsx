import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ProductEditor, useProductDraft } from "@/features/products";

// Nuevo alfajor (el borrador vacío lo arma la lista); al guardar o publicar vuelve a la lista, que avisa
export default function NewProduct() {
  const { finish } = useProductDraft();
  return (
    <Screen>
      <ProductEditor
        title="Nuevo alfajor"
        onBack={() => router.back()}
        onPreview={() => router.navigate("/settings/products/preview")}
        onSaved={(product, published) => {
          finish(product, published);
          router.dismissTo("/settings/products");
        }}
      />
    </Screen>
  );
}
