import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { FULFILLMENT_LABELS, STATUS_LABELS } from "../constants";
import { dueDayLabel } from "../rules/day";
import { lateness, latenessLabel } from "../rules/lateness";
import { orderNumber } from "../rules/number";
import { paymentLabel } from "../rules/payment";
import type { Fulfillment, OrderSummary } from "../schema/order";
import { StatusChip } from "./status-chip";

const TYPE_ICONS: Record<Fulfillment, IconName> = {
  delivery: "moped",
  pickup: "shopping-outline",
  counter: "storefront-outline",
};

type Props = { order: OrderSummary; now: Date; finished?: boolean; onPress: () => void; onPressIn?: () => void };

// Un pedido en la lista (filaPedido de la maqueta): número, día y entrega; quién y si va tarde; qué pidió; su estado,
// el total y lo que falta cobrar. Lo terminado se ve más apagado
export function OrderRow({ order, now, finished = false, onPress, onPressIn }: Props) {
  const day = dueDayLabel(order.dueDate, now);
  const number = `${orderNumber(order.number)}${day ? `, ${day}` : ""}`;
  const type =
    order.fulfillment === "pickup" && order.promisedAt
      ? `Recoge ${formatTime(new Date(order.promisedAt))}`
      : FULFILLMENT_LABELS[order.fulfillment];
  const customer = order.customerName ?? "Cliente de mostrador";
  const late = latenessLabel(lateness(order, now), now);
  const payment = paymentLabel(order);
  const total = formatCents(order.totalCents);
  const label = [number, type, customer, late, order.itemsSummary, STATUS_LABELS[order.status], total, payment]
    .filter(Boolean)
    .join(", ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={onPressIn}
      className={`flex-row gap-3 border-b border-border bg-surface px-4 py-3 ${finished ? "opacity-60" : ""}`}
    >
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-x-2">
          <Text className="font-extrabold text-sm text-text">{number}</Text>
          <View className="flex-row items-center gap-1">
            <Icon name={TYPE_ICONS[order.fulfillment]} size={15} tone="textSecondary" />
            <Text className="text-[13px] text-text-secondary">{type}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap items-center gap-x-2">
          <Text className="font-bold text-base text-text">{customer}</Text>
          {late ? <Text className="font-extrabold text-[13px] text-danger">{late}</Text> : null}
        </View>
        <Text numberOfLines={1} className="text-sm text-text-secondary">
          {order.itemsSummary}
        </Text>
      </View>
      <View className="items-end gap-1">
        <StatusChip status={order.status} />
        <Text className="font-extrabold text-base text-text">{total}</Text>
        <Text className={`font-bold text-[13px] ${payment === "Pagado" ? "text-accent" : "text-text-secondary"}`}>
          {payment}
        </Text>
      </View>
    </Pressable>
  );
}
