import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/lib/money";

import type { Product } from "../schema/product";
import { ProductAvatar } from "./product-avatar";
import { WebStateChip } from "./web-state-chip";

// Un alfajor en Productos y precios: su precio, su mínimo, su costo y cómo va en la web («Subiendo a la web…», «En la
// web», «Nuevo», la foto que espera la señal). Mientras su foto sube, va «Subiendo a la web…», aunque la copia todavía
// no la tenga. Tocarlo abre Editar
export function ProductRow({
  product,
  photoWaiting,
  photoUploading = false,
  onPress,
}: {
  product: Product;
  photoWaiting: boolean;
  photoUploading?: boolean;
  onPress: () => void;
}) {
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
        <Text numberOfLines={1} className="font-extrabold text-base text-text">
          {product.name}
        </Text>
        <Text className="font-bold text-sm text-text">{formatCents(product.priceCents)}</Text>
        <Text
          numberOfLines={1}
          className="text-[13px] text-text-secondary"
        >{`Mínimo ${product.minStock}, cuesta ${cost}`}</Text>
        <WebStateChip
          state={photoUploading && product.showOnWeb ? "pending" : product.webState}
          isNew={product.isNew}
          photoWaiting={photoWaiting}
        />
      </View>
      <Icon name="chevron-right" size={22} tone="textMuted" />
    </Pressable>
  );
}
