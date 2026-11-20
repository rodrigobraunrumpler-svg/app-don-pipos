import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshControl, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatLongDate, formatTime } from "@/lib/dates";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { FILTER_LABELS } from "../constants";
import { orderCountsQuery, orderQuery, ordersQuery } from "../queries/orders";
import type { OrderFilter, OrderSummary } from "../schema/order";
import { OrderFilters } from "./order-filters";
import { OrderRow } from "./order-row";

type Props = { onOpen: (orderId: string) => void; onNew: () => void };
type Row =
  | { type: "group"; key: string; title: string }
  | { type: "order"; key: string; order: OrderSummary; finished: boolean };

const isFinished = (order: OrderSummary) => order.status === "delivered" || order.status === "cancelled";
const orderRow = (order: OrderSummary, finished = false): Row => ({ type: "order", key: order.id, order, finished });

// «Hoy» en dos grupos: lo que sigue en curso arriba y lo terminado abajo
function groupToday(orders: OrderSummary[]): Row[] {
  const open = orders.filter((order) => !isFinished(order));
  const done = orders.filter(isFinished);
  return [
    ...(open.length
      ? [{ type: "group" as const, key: "open", title: "En curso" }, ...open.map((order) => orderRow(order))]
      : []),
    ...(done.length
      ? [{ type: "group" as const, key: "done", title: "Terminados" }, ...done.map((order) => orderRow(order, true))]
      : []),
  ];
}

// La pestaña Pedidos (PANTALLAS.pedidos): la búsqueda, los filtros con su cantidad y la lista por páginas de 20
export function OrderList({ onOpen, onNew }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderFilter>("today");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  // La rueda de recarga, solo mientras el dueño tira hacia abajo
  const [pulling, setPulling] = useState(false);
  const counts = useQuery(orderCountsQuery);
  const list = useInfiniteQuery(ordersQuery(filter, search));
  const now = new Date();

  // Busca cuando el dueño deja de escribir
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const orders = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const rows = filter === "today" ? groupToday(orders) : orders.map((order) => orderRow(order));
  const noOrdersYet = counts.data?.all === 0 && !search;
  const label = FILTER_LABELS[filter];

  const footer = list.isFetchingNextPage ? (
    <View className="py-3">
      <SkeletonRows rows={2} />
    </View>
  ) : list.hasNextPage ? (
    <View className="items-center gap-2 py-4">
      <Text className="text-[13px] text-text-secondary">{`Mostrando ${orders.length} de ${total}`}</Text>
      <Button
        variant="secondary"
        label={`Cargar ${Math.min(20, total - orders.length)} más`}
        disabled={!online}
        onPress={() => void list.fetchNextPage()}
      />
    </View>
  ) : filter === "all" && orders.length > 0 ? (
    <Text className="py-4 text-center text-[13px] text-text-secondary">{`No hay más pedidos: ya ves los ${total}.`}</Text>
  ) : null;

  return (
    <View className="flex-1">
      <View className="px-5 pb-3 pt-4">
        <Text accessibilityRole="header" className="font-extrabold text-3xl text-text">
          Pedidos
        </Text>
        <Text className="text-sm text-text-secondary">{formatLongDate(now)}</Text>
      </View>
      {noOrdersYet ? null : (
        <View className="gap-3 pb-2">
          <View className="mx-5 min-h-[46px] flex-row items-center gap-2 rounded-full border-[1.5px] border-border-strong bg-surface px-4">
            <Icon name="magnify" size={20} tone="textMuted" />
            <TextInput
              accessibilityLabel="Buscar pedidos"
              placeholder="Buscar por cliente o número"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              returnKeyType="search"
              className="flex-1 text-base text-text"
            />
          </View>
          <OrderFilters filter={filter} counts={counts.data} onChange={setFilter} />
          {online || !list.data ? null : (
            <View className="px-5">
              <Notice>{`Sin conexión. Ves los pedidos de las ${formatTime(new Date(list.dataUpdatedAt))}.`}</Notice>
            </View>
          )}
        </View>
      )}
      {!list.data && list.isError ? (
        <LoadError what="los pedidos" onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : noOrdersYet ? (
        <View className="items-center px-5 pt-10">
          <Icon name="clipboard-text-outline" size={42} tone="textMuted" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Todavía no hay pedidos</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Anota el primero con el botón + de abajo. Aquí verás su estado y lo que falta cobrar.
          </Text>
          <View className="mt-5 w-full">
            <Button label="Anotar un pedido" icon={<Icon name="plus" size={18} tone="onPrimary" />} onPress={onNew} />
          </View>
        </View>
      ) : orders.length === 0 ? (
        <Text className="px-5 pt-6 text-center text-base text-text-secondary">
          {search ? `Ningún pedido de «${label}» coincide con «${search}».` : `No hay pedidos en «${label}».`}
        </Text>
      ) : (
        <FlashList
          testID="orders"
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          renderItem={({ item: row }) =>
            row.type === "group" ? (
              <Text className="pb-1.5 pt-4 font-extrabold text-[13px] text-text-secondary">{row.title}</Text>
            ) : (
              <OrderRow
                order={row.order}
                now={now}
                finished={row.finished}
                onPress={() => onOpen(row.order.id)}
                onPressIn={() => void queryClient.prefetchQuery(orderQuery(row.order.id))}
              />
            )
          }
          ListFooterComponent={footer}
          onEndReached={() => {
            if (online && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => {
                setPulling(true);
                void Promise.all([list.refetch(), counts.refetch()]).finally(() => setPulling(false));
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
