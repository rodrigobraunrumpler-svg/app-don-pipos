import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";

import { ProductAvatar } from "@/features/products";
import { stockOverviewQuery, type StockState } from "@/features/stock";

import { PartError } from "./part-error";

// Como en Stock: ámbar lo que se acaba, rojo lo agotado y lo que no cuadra
const NUMBER: Record<StockState, string> = {
  ok: "text-text",
  low: "text-warning",
  owed: "text-warning",
  out: "text-danger",
  check: "text-danger",
};
const RING: Record<StockState, string> = {
  ok: "border-border",
  low: "border-warning",
  owed: "border-warning",
  out: "border-border opacity-50",
  check: "border-danger",
};
const MINUS = "−";

type Props = { onProduct: (productId: string) => void; onStock: () => void };

// «Tu stock» (la bandeja de la maqueta): cada alfajor con lo que queda, que abre su detalle, y «Ver stock»
export function StockTray({ onProduct, onStock }: Props) {
  const { data, isError, refetch } = useQuery(stockOverviewQuery);
  if (data?.length === 0) return null;
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
          Tu stock
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver stock"
          onPress={onStock}
          className="min-h-11 justify-center"
        >
          <Text className="font-extrabold text-sm text-accent">Ver stock</Text>
        </Pressable>
      </View>
      {!data && isError ? (
        <PartError what="tu stock" onRetry={() => void refetch()} />
      ) : !data ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Cargando"
          className="mt-1 h-28 rounded-md bg-sunken"
        />
      ) : (
        <View className="mt-1 flex-row flex-wrap rounded-md border border-border bg-surface px-1.5 py-3">
          {data.map((item) => (
            <Pressable
              key={item.productId}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}: ${item.onHand} en stock. Ver detalle`}
              onPress={() => onProduct(item.productId)}
              className="w-1/5 items-center gap-1 py-1"
            >
              <View className={`rounded-full border-2 p-0.5 ${RING[item.state]}`}>
                <ProductAvatar product={item} />
              </View>
              <Text className={`font-extrabold text-lg ${NUMBER[item.state]}`}>
                {`${item.onHand < 0 ? MINUS : ""}${Math.abs(item.onHand)}`}
              </Text>
              <Text numberOfLines={2} className="text-center text-[11.5px] leading-[14px] text-text-secondary">
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
