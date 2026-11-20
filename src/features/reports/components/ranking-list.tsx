import { Text, View } from "react-native";

import { ProductAvatar } from "@/features/products";
import { formatCents } from "@/lib/money";

import { rankBy, unitsText, type RankBy } from "../rules/ranking";
import type { Ranking } from "../schema/report";

// Los alfajores del más al menos vendido, con una barra para comparar
export function RankingList({ products, by }: { products: Ranking["products"]; by: RankBy }) {
  const ranked = rankBy(products, by);
  const value = (product: (typeof ranked)[number]) => (by === "units" ? product.units : product.salesCents);
  const max = Math.max(1, ...ranked.map(value));
  return (
    <View className="mt-4 gap-3 rounded-md border border-border bg-surface p-4">
      {ranked.map((product, index) => {
        const shown = by === "units" ? String(product.units) : formatCents(product.salesCents);
        const spoken = by === "units" ? unitsText(product.units) : shown;
        return (
          <View
            key={product.productId}
            accessible
            accessibilityLabel={`${index + 1}. ${product.name}: ${spoken}`}
            className="flex-row items-center gap-2.5"
          >
            <Text className="w-[18px] font-extrabold text-sm text-text-muted">{String(index + 1)}</Text>
            <ProductAvatar product={product} size="mini" />
            <View className="flex-1 gap-1.5">
              <Text numberOfLines={1} className="font-extrabold text-[14.5px] text-text">
                {product.name}
              </Text>
              <View className="h-2 overflow-hidden rounded-full bg-sunken">
                <View
                  style={{ width: `${(Math.max(0, value(product)) / max) * 100}%` }}
                  className="h-full rounded-full bg-primary"
                />
              </View>
            </View>
            <Text className="min-w-16 text-right font-extrabold text-[15px] text-text">{shown}</Text>
          </View>
        );
      })}
    </View>
  );
}
