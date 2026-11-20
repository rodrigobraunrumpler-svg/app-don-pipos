import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/lib/money";

import { lineLabel } from "../rules/line";
import type { Order } from "../schema/order";
import { SummaryRow } from "./summary-row";

// Lo que lleva el pedido, con los precios del momento en que se vendió (D9)
export function OrderItems({ order }: { order: Order }) {
  return (
    <View className="mt-5 rounded-md border border-border bg-surface px-4 py-3">
      {order.lines.map((line) => (
        <View key={line.productId} className="flex-row justify-between py-1">
          <View>
            <Text className="text-base text-text">{lineLabel(line.quantity, line.productName)}</Text>
            <Text className="text-[13px] text-text-secondary">{`${formatCents(line.unitPriceCents)} c/u`}</Text>
          </View>
          <Text className="text-base text-text">{formatCents(line.quantity * line.unitPriceCents)}</Text>
        </View>
      ))}
      {order.deliveryFeeCents > 0 ? <SummaryRow label="Delivery" value={formatCents(order.deliveryFeeCents)} /> : null}
      {order.discountCents > 0 ? (
        <SummaryRow
          label={`Descuento${order.discountReason ? ` (${order.discountReason.toLowerCase()})` : ""}`}
          value={`−${formatCents(order.discountCents)}`}
        />
      ) : null}
      <SummaryRow label="Total" value={formatCents(order.totalCents)} strong />
      <View className="mt-2 flex-row items-center gap-2">
        <Icon name="lock-outline" size={15} tone="textMuted" />
        <Text className="flex-1 text-[13px] text-text-secondary">
          Los precios quedan como se vendieron, aunque después cambien.
        </Text>
      </View>
    </View>
  );
}
