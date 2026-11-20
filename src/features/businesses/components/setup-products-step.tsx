import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { NewProductSheet, ProductAvatar, productsQuery } from "@/features/products";
import { formatCents } from "@/lib/money";

import { SetupHeader } from "./setup-header";
import { SetupTitle } from "./setup-title";

// Paso 1, «Tus productos»: los alfajores que cargó el equipo, con su precio. Se revisan; «Agregar otro producto» abre
// la misma hoja de Productos
export function SetupProductsStep({ onNext }: { onNext: () => void }) {
  const { data, isError, refetch } = useQuery(productsQuery);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const products = data?.filter((product) => product.isActive);

  return (
    <View className="flex-1">
      <SetupHeader step={1} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-4">
        <SetupTitle
          title="Tus productos"
          text="Revisa tus alfajores y sus precios. Puedes cambiarlos después en Ajustes."
        />
        {products ? (
          products.map((product) => (
            <View key={product.id} className="min-h-[60px] flex-row items-center gap-3 border-b border-border py-2">
              <ProductAvatar product={product} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-bold text-base text-text">
                  {product.name}
                </Text>
                <Text className="text-sm text-text-secondary">{formatCents(product.priceCents)}</Text>
              </View>
              <Icon name="check-circle-outline" size={22} tone="olive" />
            </View>
          ))
        ) : isError ? (
          <LoadError what="tus productos" onRetry={() => void refetch()} />
        ) : (
          <SkeletonRows rows={5} />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding(true)}
          className="mt-3 min-h-11 flex-row items-center gap-2"
        >
          <Icon name="plus" size={20} tone="accent" />
          <Text className="font-extrabold text-sm text-accent">Agregar otro producto</Text>
        </Pressable>
      </ScrollView>
      <View className="px-5 pb-3 pt-2">
        <Button label="Siguiente" onPress={onNext} />
      </View>
      {adding ? (
        <NewProductSheet
          onClose={() => setAdding(false)}
          onSaved={(message) => {
            setAdding(false);
            setToast(message);
          }}
        />
      ) : null}
      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}
