import { useInfiniteQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ordersQuery, type OrderFilter } from "@/features/orders";

import { OrderSection } from "./order-section";
import { PartError } from "./part-error";

type Props = {
  now: Date;
  onOpenOrder: (orderId: string) => void;
  onOrders: (filter: OrderFilter) => void;
  onNewOrder: () => void;
};

// Lo que falta entregar (de hoy y atrasado) y lo próximo, con las mismas listas que Pedidos: nunca difieren. Sin
// ninguno, invita a anotar un pedido (se puede armar sin señal: queda guardado en el celular)
export function HomeOrders({ now, onOpenOrder, onOrders, onNewOrder }: Props) {
  const toDeliver = useInfiniteQuery(ordersQuery("to_deliver", ""));
  const upcoming = useInfiniteQuery(ordersQuery("upcoming", ""));
  if ((!toDeliver.data && toDeliver.isError) || (!upcoming.data && upcoming.isError))
    return (
      <PartError
        what="los pedidos"
        onRetry={() => {
          void toDeliver.refetch();
          void upcoming.refetch();
        }}
      />
    );
  if (!toDeliver.data || !upcoming.data)
    return (
      <View className="mt-6">
        <SkeletonRows rows={3} />
      </View>
    );
  const first = { deliver: toDeliver.data.pages[0], next: upcoming.data.pages[0] };
  const deliver = first.deliver?.items ?? [];
  const next = first.next?.items ?? [];
  if (deliver.length === 0 && next.length === 0)
    return (
      <View className="mt-6 rounded-md border border-border bg-surface p-4">
        <Text className="text-center text-sm text-text-secondary">
          Cuando anotes un pedido, aparece aquí con su estado y lo que falta cobrar.
        </Text>
        <View className="mt-3">
          <Button
            label="Anotar un pedido"
            icon={<Icon name="plus" size={18} tone="onPrimary" />}
            onPress={onNewOrder}
          />
        </View>
      </View>
    );
  const section = { now, onOpenOrder, onOrders };
  return (
    <>
      {deliver.length > 0 ? (
        <OrderSection
          {...section}
          title="Por entregar"
          filter="to_deliver"
          orders={deliver}
          total={first.deliver?.meta.total ?? 0}
        />
      ) : null}
      {next.length > 0 ? (
        <OrderSection
          {...section}
          title="Próximos"
          filter="upcoming"
          orders={next}
          total={first.next?.meta.total ?? 0}
        />
      ) : null}
    </>
  );
}
