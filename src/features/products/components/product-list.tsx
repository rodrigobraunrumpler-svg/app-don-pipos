import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { confirmTap } from "@/lib/haptics";
import { useOnline } from "@/lib/use-online";

import { productsQuery } from "../queries/products";
import type { Product } from "../schema/product";
import { NewProductSheet } from "./new-product-sheet";
import { ProductRow } from "./product-row";
import { ProductSheet } from "./product-sheet";

// Más → Productos y precios: la lista, la hoja de cada uno y «Agregar producto»
export function ProductList({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const { data, isError, refetch } = useQuery(productsQuery);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const linked = data?.some((product) => product.linkedToWeb) ?? false;

  function saved(message: string) {
    setEditing(null);
    setAdding(false);
    setToast(message);
    confirmTap();
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 px-3 pb-2 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={8} className="p-2">
          <Icon name="arrow-left" size={24} />
        </Pressable>
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-extrabold text-2xl text-text">
            Productos y precios
          </Text>
          {linked ? <Text className="text-sm text-text-secondary">Se copian solos a la web</Text> : null}
        </View>
      </View>
      {data ? (
        <ScrollView contentContainerClassName="px-5 pb-24">
          {online || editing || adding ? null : <Notice>Sin conexión. Para cambiar precios, espera la señal.</Notice>}
          {linked ? (
            <View className="mt-3 flex-row gap-2.5 rounded-sm bg-olive-soft px-3 py-3">
              <Icon name="information-outline" size={18} tone="olive" />
              <Text className="flex-1 text-sm text-text">
                El precio y si está disponible se ven en la web en unos segundos. Las fotos y descripciones se cambian
                en el panel de la web.
              </Text>
            </View>
          ) : null}
          <View className="mt-3.5 overflow-hidden rounded-md border border-border bg-surface">
            {data.map((product) => (
              <ProductRow key={product.id} product={product} onPress={() => setEditing(product)} />
            ))}
          </View>
          <View className="mt-3.5">
            <Button
              label="Agregar producto"
              variant="secondary"
              icon={<Icon name="plus" size={20} />}
              onPress={() => setAdding(true)}
            />
          </View>
        </ScrollView>
      ) : isError ? (
        <LoadError what="tus productos" onRetry={() => void refetch()} />
      ) : (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      )}
      {editing ? <ProductSheet product={editing} onClose={() => setEditing(null)} onSaved={saved} /> : null}
      {adding ? <NewProductSheet onClose={() => setAdding(false)} onSaved={saved} /> : null}
      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}
