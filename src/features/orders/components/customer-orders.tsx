import { useInfiniteQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useOnline } from "@/lib/use-online";

import { customerOrdersQuery } from "../queries/orders";
import { OrderRow } from "./order-row";

type Props = { customerId: string; onOpen: (orderId: string) => void };

// «Sus pedidos» en la ficha del cliente, con las filas de Pedidos, de 20 en 20
export function CustomerOrders({ customerId, onOpen }: Props) {
  const online = useOnline();
  const list = useInfiniteQuery(customerOrdersQuery(customerId));
  const orders = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const now = new Date();
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        Sus pedidos
      </Text>
      {!list.data ? (
        <SkeletonRows rows={2} />
      ) : orders.length === 0 ? (
        <Text className="text-sm text-text-secondary">Todavía no tiene pedidos.</Text>
      ) : (
        <View className="overflow-hidden rounded-md border border-border">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} now={now} onPress={() => onOpen(order.id)} />
          ))}
        </View>
      )}
      {list.hasNextPage ? (
        <Button
          variant="text"
          label={list.isFetchingNextPage ? "Cargando…" : `Ver ${Math.min(20, total - orders.length)} más`}
          disabled={!online || list.isFetchingNextPage}
          onPress={() => void list.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}
