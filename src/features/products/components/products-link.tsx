import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { productsQuery } from "../queries/products";

// Más → Ajustes: la fila «Productos y precios», con cuántos alfajores hay
export function ProductsLink({ onPress }: { onPress: () => void }) {
  const { data } = useQuery(productsQuery);
  return (
    <View className="gap-2">
      <Text className="px-1 font-extrabold text-sm text-text-secondary">Ajustes</Text>
      <View className="overflow-hidden rounded-md border border-border bg-surface">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Productos y precios"
          onPress={onPress}
          className="min-h-[54px] flex-row items-center gap-3 px-4"
        >
          <Icon name="cookie" size={20} tone="olive" />
          <Text className="flex-1 font-semibold text-base text-text">Productos y precios</Text>
          {data ? (
            <Text className="text-sm text-text-secondary">{`${data.length} ${data.length === 1 ? "alfajor" : "alfajores"}`}</Text>
          ) : null}
          <Icon name="chevron-right" size={20} tone="textMuted" />
        </Pressable>
      </View>
    </View>
  );
}
