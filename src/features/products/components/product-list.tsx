import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { usePendingPhotos } from "../hooks/use-pending-photos";
import { useFollowPublished, useWebNotices } from "../hooks/use-web-notices";
import { productsQuery } from "../queries/products";
import type { Product } from "../schema/product";
import { ProductRow } from "./product-row";
import { WebFailingNotice } from "./web-failing-notice";

type Props = { onBack: () => void; onOpen: (product: Product) => void; onNew: () => void; onOrder: () => void };

// Productos y precios (desde Ajustes o Stock): cada alfajor con cómo va en la web, «Agregar producto» y «Ordenar».
// Mientras alguno se está subiendo a la web, la lista se vuelve a pedir cada 3 segundos (hasta 1 minuto)
export function ProductList({ onBack, onOpen, onNew, onOrder }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const { data, isError, refetch } = useQuery({ ...productsQuery, refetchInterval: useFollowPublished() });
  const toast = useWebNotices(data);
  const photos = usePendingPhotos();
  // La rueda de recarga, solo mientras el dueño tira hacia abajo: con cada recarga de fondo aparecía sola
  const [pulling, setPulling] = useState(false);
  const failing = data?.some((product) => product.webState === "failing") ?? false;

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
          <Text className="text-sm text-text-secondary">Se copian solos a la web</Text>
        </View>
      </View>
      {data ? (
        <ScrollView
          testID="products-scroll"
          contentContainerClassName="px-5 pb-24"
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => {
                setPulling(true);
                void refetch().finally(() => setPulling(false));
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {online ? null : <Notice>Sin conexión. Para cambiar un alfajor, espera la señal.</Notice>}
          {failing ? <WebFailingNotice /> : null}
          {photos.failed > 0 ? (
            <View accessibilityRole="alert" className="mt-3 gap-1 rounded-md bg-warning-soft px-4 py-3">
              <Text className="font-bold text-sm text-text">
                {`La foto de ${photos.failed} ${photos.failed === 1 ? "alfajor" : "alfajores"} no se subió.`}
              </Text>
              <View className="self-start">
                <Button variant="text" label="Reintentar las fotos" onPress={photos.retryAll} />
              </View>
            </View>
          ) : null}
          <View className="mt-3 flex-row gap-2.5 rounded-sm bg-olive-soft px-3 py-3">
            <Icon name="information-outline" size={18} tone="olive" />
            <Text className="flex-1 text-sm text-text">
              Lo que cambies aquí (la foto, la descripción, el precio y si hay stock) se ve en la web en unos segundos.
            </Text>
          </View>
          <View className="mt-3.5 overflow-hidden rounded-md border border-border bg-surface">
            {data.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                photoWaiting={photos.waiting.has(product.id)}
                onPress={() => onOpen(product)}
              />
            ))}
          </View>
          <View className="mt-3.5 gap-2">
            <Button
              label="Agregar producto"
              variant="secondary"
              icon={<Icon name="plus" size={20} />}
              onPress={onNew}
            />
            <Button label="Ordenar" variant="secondary" icon={<Icon name="sort" size={20} />} onPress={onOrder} />
          </View>
        </ScrollView>
      ) : isError ? (
        <LoadError what="tus productos" onRetry={() => void refetch()} />
      ) : (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      )}
      {toast ? (
        <Toast
          message={toast.message}
          actionLabel={toast.action?.label}
          onAction={toast.action?.run}
          onHide={toast.hide}
        />
      ) : null}
    </View>
  );
}
