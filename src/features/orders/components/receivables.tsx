import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { orderQuery, receivablesQuery } from "../queries/orders";
import { ReceivableRow } from "./receivable-row";

type Props = { onBack: () => void; onOpen: (orderId: string) => void };

// Por cobrar (PANTALLAS.porcobrar): cuánto te deben en total y la lista, de 20 en 20, del número mayor al menor
export function Receivables({ onBack, onOpen }: Props) {
  const online = useOnline();
  const queryClient = useQueryClient();
  const list = useInfiniteQuery(receivablesQuery);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const meta = list.data?.pages[0]?.meta;
  const now = new Date();

  return (
    <View className="flex-1">
      <FormHeader title="Por cobrar" subtitle="Lo que te deben, de todos los pedidos" onBack={onBack} />
      {!list.data && list.isError ? (
        <LoadError what="los saldos" onRetry={() => void list.refetch()} />
      ) : !meta ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : items.length === 0 ? (
        <View className="items-center px-5 pt-10">
          <Icon name="check-circle-outline" size={42} tone="accent" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Nadie te debe</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Todo lo entregado está cobrado. Cuando quede un saldo, aparece aquí.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-6">
          {online ? null : (
            <Notice>{`Sin conexión. Ves los saldos de las ${formatTime(new Date(list.dataUpdatedAt))}.`}</Notice>
          )}
          <View className="mt-3.5 rounded-md bg-primary px-4 py-4">
            <Text className="text-sm text-on-primary">Te deben</Text>
            <Text className="font-extrabold text-3xl text-on-primary">{formatCents(meta.totalDueCents)}</Text>
            <Text className="text-sm text-on-primary">{`${meta.total} ${meta.total === 1 ? "pedido" : "pedidos"}`}</Text>
          </View>
          <View className="mt-3.5 overflow-hidden rounded-md border border-border">
            {items.map((item) => (
              <ReceivableRow
                key={item.id}
                item={item}
                now={now}
                onPress={() => {
                  void queryClient.prefetchQuery(orderQuery(item.id));
                  onOpen(item.id);
                }}
              />
            ))}
          </View>
          {list.hasNextPage ? (
            <View className="items-center gap-2 py-4">
              <Text className="text-[13px] text-text-secondary">{`Mostrando ${items.length} de ${meta.total}`}</Text>
              <Button
                variant="secondary"
                label={list.isFetchingNextPage ? "Cargando…" : `Cargar ${Math.min(20, meta.total - items.length)} más`}
                disabled={!online || list.isFetchingNextPage}
                onPress={() => void list.fetchNextPage()}
              />
            </View>
          ) : null}
          <View className="mt-3 flex-row gap-2">
            <Icon name="information-outline" size={17} tone="textSecondary" />
            <Text className="flex-1 text-[13px] text-text-secondary">
              El recordatorio solo aparece si ya entregaste o si recibiste un adelanto.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
