import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProductAvatar } from "@/features/products";
import { formatCents } from "@/lib/money";

import { profitText } from "../rules/ranking";
import type { Ranking } from "../schema/report";

type Props = { products: Ranking["products"]; onProducts: () => void };

// «Ganancia por alfajor», con el costo de cada venta. Sin ningún costo, invita a ponerlos en Productos
export function ProductProfit({ products, onProducts }: Props) {
  const anyCost = products.some((product) => product.profitCents !== null);
  return (
    <View className="mt-6">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        Ganancia por alfajor
      </Text>
      {anyCost ? (
        <>
          <View className="mt-2 overflow-hidden rounded-md border border-border bg-surface">
            {products.map((product) => (
              <View
                key={product.productId}
                className="min-h-14 flex-row items-center gap-3 border-b border-border px-4 py-2.5"
              >
                <ProductAvatar product={product} size="mini" />
                <View className="flex-1">
                  <Text className="font-extrabold text-sm text-text">{product.name}</Text>
                  <Text className="text-[13px] text-text-secondary">{profitText(product)}</Text>
                </View>
                <Text
                  className={`font-extrabold text-sm ${product.profitCents !== null && product.profitCents < 0 ? "text-danger" : "text-olive"}`}
                >
                  {product.profitCents === null ? "—" : formatCents(product.profitCents)}
                </Text>
              </View>
            ))}
          </View>
          <View className="mt-2 flex-row gap-2">
            <Icon name="information-outline" size={17} tone="textSecondary" />
            <Text className="flex-1 text-[13px] text-text-secondary">
              Con el costo aproximado de cada alfajor, que se cambia en Productos.
            </Text>
          </View>
        </>
      ) : (
        <View className="mt-2 rounded-md border border-border bg-surface p-4">
          <Text className="text-center text-sm text-text-secondary">
            Pon un costo aproximado a cada alfajor en Productos y aquí verás cuánto ganas con cada uno.
          </Text>
          <View className="mt-3">
            <Button
              label="Ir a Productos"
              icon={<Icon name="cog-outline" size={18} tone="onPrimary" />}
              onPress={onProducts}
            />
          </View>
        </View>
      )}
    </View>
  );
}
