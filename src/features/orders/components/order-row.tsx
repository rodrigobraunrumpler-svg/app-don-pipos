import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { FULFILLMENT_LABELS, STATUS_LABELS } from "../constants";
import { dueDayLabel } from "../rules/day";
import { lateness, latenessLabel, latenessShortLabel } from "../rules/lateness";
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

// Un pedido en la lista (filaPedido de la maqueta), en tres líneas alineadas: número y entrega con su estado; quién (y
// si va tarde) con el total; qué pidió con lo que falta cobrar. A la izquierda, lo que no entra se corta con «…»; a la
// derecha, el estado y los montos nunca se cortan. Lo terminado se ve más apagado
export function OrderRow({ order, now, finished = false, onPress, onPressIn }: Props) {
  const day = dueDayLabel(order.dueDate, now);
  const number = `${orderNumber(order.number)}${day ? `, ${day}` : ""}`;
  const type =
    order.fulfillment === "pickup" && order.promisedAt
      ? `Recoge ${formatTime(new Date(order.promisedAt))}`
      : FULFILLMENT_LABELS[order.fulfillment];
  const customer = order.customerName ?? "Cliente de mostrador";
  const late = lateness(order, now);
  const payment = paymentLabel(order);
  const total = formatCents(order.totalCents);
  // El lector de pantalla lee todo entero, con el estado y el atraso completos
  const label = [
    number,
    type,
    customer,
    latenessLabel(late, now),
    order.itemsSummary,
    STATUS_LABELS[order.status],
    total,
    payment,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={onPressIn}
      className={`gap-1 border-b border-border bg-surface px-4 py-3 ${finished ? "opacity-60" : ""}`}
    >
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="shrink-0 font-extrabold text-sm text-text">{number}</Text>
          <Icon name={TYPE_ICONS[order.fulfillment]} size={15} tone="textSecondary" />
          <Text numberOfLines={1} className="flex-1 text-[13px] text-text-secondary">
            {type}
          </Text>
        </View>
        <StatusChip status={order.status} short />
      </View>
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center gap-2">
          <Text numberOfLines={1} className="shrink font-bold text-base text-text">
            {customer}
          </Text>
          {late ? (
            <Text className="shrink-0 font-extrabold text-[13px] text-danger">{latenessShortLabel(late)}</Text>
          ) : null}
        </View>
        <Text className="shrink-0 font-extrabold text-base text-text">{total}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="flex-1 text-sm text-text-secondary">
          {order.itemsSummary}
        </Text>
        <Text
          className={`shrink-0 font-bold text-[13px] ${payment === "Pagado" ? "text-accent" : "text-text-secondary"}`}
        >
          {payment}
        </Text>
      </View>
    </Pressable>
  );
}
