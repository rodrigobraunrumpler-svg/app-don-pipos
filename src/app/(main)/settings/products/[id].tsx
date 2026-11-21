import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { LoadError } from "@/components/ui/load-error";
import { Screen } from "@/components/ui/screen";
import { SkeletonRows } from "@/components/ui/skeleton";
import { draftFrom, ProductEditor, productsQuery, useProductDraft } from "@/features/products";

// Editar un alfajor. El borrador lo arma la lista al abrirlo; si la pantalla se abre sola, sale de lo guardado
export default function EditProduct() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useQuery(productsQuery);
  const product = products.data?.find((item) => item.id === id);
  const { draft, start, finish } = useProductDraft();
  const ready = draft.id === id;
  useEffect(() => {
    if (product && !ready) start(draftFrom(product));
  }, [product, ready, start]);

  return (
    <Screen>
      {ready && product ? (
        <ProductEditor
          title={product.name}
          onBack={() => router.back()}
          onPreview={() => router.navigate("/settings/products/preview")}
          onSaved={(saved, published) => {
            finish(saved, published);
            router.dismissTo("/settings/products");
          }}
        />
      ) : products.isError || (products.data && !product) ? (
        <LoadError what="el alfajor" onRetry={() => void products.refetch()} />
      ) : (
        <View className="px-5 pt-6">
          <SkeletonRows rows={5} />
        </View>
      )}
    </Screen>
  );
}
