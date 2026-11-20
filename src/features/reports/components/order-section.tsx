import { Pressable, Text, View } from "react-native";

import { OrderRow, type OrderFilter, type OrderSummary } from "@/features/orders";

type Props = {
  title: string;
  filter: OrderFilter;
  orders: OrderSummary[];
  total: number;
  now: Date;
  onOpenOrder: (orderId: string) => void;
  onOrders: (filter: OrderFilter) => void;
};

// «Por entregar» o «Próximos» en Inicio, con las filas de Pedidos. Si hay más de los que entran, «Ver los N en Pedidos»
export function OrderSection({ title, filter, orders, total, now, onOpenOrder, onOrders }: Props) {
  return (
    <View className="mt-6">
      <View className="flex-row items-center gap-2">
        <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
          {title}
        </Text>
        <View className="min-w-6 items-center rounded-full bg-sunken px-2 py-0.5">
          <Text className="font-extrabold text-xs text-text-secondary">{String(total)}</Text>
        </View>
      </View>
      <View className="mt-2 overflow-hidden rounded-md border border-border">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} now={now} onPress={() => onOpenOrder(order.id)} />
        ))}
      </View>
      {total > orders.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver los ${total} en Pedidos`}
          onPress={() => onOrders(filter)}
          className="min-h-11 items-center justify-center"
        >
          <Text className="font-extrabold text-sm text-accent">{`Ver los ${total} en Pedidos`}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
