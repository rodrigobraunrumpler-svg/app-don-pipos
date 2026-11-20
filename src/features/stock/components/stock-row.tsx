import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { ProductAvatar } from "@/features/products";

import { STOCK_STATE_LABELS } from "../constants";
import { stockLine } from "../rules/coverage";
import type { StockItem, StockState } from "../schema/stock";
import { StateChip } from "./state-chip";

const NUMBER: Record<StockState, string> = {
  ok: "text-text",
  low: "text-warning",
  owed: "text-warning",
  out: "text-danger",
  check: "text-danger",
};
const MINUS = "−";

// Un alfajor en Stock: su línea, el número grande y su estado. Si está enlazado y sin stock, «Agotado en la web»
export function StockRow({ item, onPress }: { item: StockItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}: ${item.onHand} en stock. ${STOCK_STATE_LABELS[item.state]}. Ver detalle`}
      onPress={onPress}
      className="min-h-[72px] flex-row items-center gap-3 border-b border-border px-4 py-3"
    >
      <ProductAvatar product={item} />
      <View className="flex-1">
        <Text className="font-extrabold text-base text-text">{item.name}</Text>
        <Text className="text-[13px] text-text-secondary">{stockLine(item, new Date())}</Text>
        {item.linkedToWeb && item.onHand <= 0 ? (
          <View className="mt-0.5 flex-row items-center gap-1">
            <Icon name="link-variant-off" size={14} tone="danger" />
            <Text className="font-bold text-xs text-danger">Agotado en la web</Text>
          </View>
        ) : null}
      </View>
      <View className="items-end gap-1">
        <Text className={`font-extrabold text-2xl ${NUMBER[item.state]}`}>
          {item.onHand < 0 ? `${MINUS}${-item.onHand}` : String(item.onHand)}
        </Text>
        <StateChip state={item.state} />
      </View>
    </Pressable>
  );
}
