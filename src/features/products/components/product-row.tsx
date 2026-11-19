import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/lib/money";

import type { Product } from "../schema/product";
import { ProductAvatar } from "./product-avatar";

// Un alfajor en Productos y precios: su precio, su mínimo, su costo y, si está enlazado, si se ve en la web
export function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const cost = product.costCents === null ? "sin definir" : formatCents(product.costCents);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCents(product.priceCents)}`}
      onPress={onPress}
      className="min-h-[72px] flex-row items-center gap-3 border-b border-border px-4 py-3"
    >
      <ProductAvatar product={product} />
      <View className="flex-1">
        <Text className="font-extrabold text-base text-text">{product.name}</Text>
        <Text className="font-bold text-sm text-text">{formatCents(product.priceCents)}</Text>
        <Text className="text-[13px] text-text-secondary">{`Mínimo ${product.minStock}, cuesta ${cost}`}</Text>
      </View>
      {product.linkedToWeb ? (
        <View className="flex-row items-center gap-1">
          <Icon name="link-variant" size={15} tone={product.showOnWeb ? "olive" : "textMuted"} />
          <Text className={`font-bold text-[13px] ${product.showOnWeb ? "text-olive" : "text-text-muted"}`}>
            {product.showOnWeb ? "En la web" : "Oculto"}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
