import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/features/businesses";
import { businessDate, formatMonth, formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { incomeQuery, incomeSummaryQuery } from "../queries/income";
import type { IncomeItem } from "../schema/income";
import { IncomeItemRow } from "./income-item-row";
import { VoidIncomeSheet } from "./void-income-sheet";

type Props = { onBack: () => void; onNew: () => void; onOpenOrder: (orderId: string) => void };

// Ingresos (desde la tarjeta de Reportes; tiene la forma de Gastos): lo cobrado en el mes por medio, «Anotar ingreso»
// y la lista de 20 en 20. Un pago abre su pedido; un ingreso a mano, su hoja para anularlo
export function IncomeOverview({ onBack, onNew, onOpenOrder }: Props) {
  const online = useOnline();
  const now = new Date();
  const today = businessDate(now);
  const month = formatMonth(now);
  const summary = useQuery(incomeSummaryQuery(`${today.slice(0, 8)}01`, today)).data;
  const list = useInfiniteQuery(incomeQuery);
  const [voiding, setVoiding] = useState<IncomeItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // El compilador de React la memoriza: el aviso no reinicia su tiempo con cada repintado
  const hideMessage = () => setMessage(null);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const byMethod = PAYMENT_METHODS.filter((method) => (summary?.byMethod[method] ?? 0) !== 0);

  const header = (
    <View className="pb-2">
      {online ? null : (
        <Notice>{`Sin conexión. Ves los ingresos de las ${formatTime(new Date(list.dataUpdatedAt))}.`}</Notice>
      )}
      <View className="mt-3 gap-1 rounded-md border border-border bg-surface px-4 py-4">
        <Text className="text-sm text-text-secondary">{`Cobrado en ${month}`}</Text>
        <Text className="font-extrabold text-3xl text-text">{formatCents(summary?.totalCents ?? 0)}</Text>
        {byMethod.map((method) => (
          <View key={method} className="flex-row items-center justify-between">
            <Text className="text-sm text-text-secondary">{PAYMENT_METHOD_LABELS[method]}</Text>
            <Text className="font-bold text-sm text-text">{formatCents(summary?.byMethod[method] ?? 0)}</Text>
          </View>
        ))}
      </View>
      <View className="mt-3">
        <Button
          label="Anotar ingreso"
          icon={<Icon name="plus" size={18} tone="onPrimary" />}
          disabled={!online}
          onPress={onNew}
        />
      </View>
      <Text accessibilityRole="header" className="mt-5 font-extrabold text-lg text-text">
        Lo que entró
      </Text>
    </View>
  );

  const footer = list.hasNextPage ? (
    <View className="items-center gap-2 py-4">
      <Text className="text-[13px] text-text-secondary">{`Mostrando ${items.length} de ${total}`}</Text>
      <Button
        variant="secondary"
        label={list.isFetchingNextPage ? "Cargando…" : `Cargar ${Math.min(20, total - items.length)} más`}
        disabled={!online || list.isFetchingNextPage}
        onPress={() => void list.fetchNextPage()}
      />
    </View>
  ) : null;

  return (
    <View className="flex-1">
      <FormHeader title="Ingresos" subtitle={month.charAt(0).toUpperCase() + month.slice(1)} onBack={onBack} />
      {!list.data && list.isError ? (
        <LoadError what="los ingresos" onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : items.length === 0 ? (
        <View className="items-center px-5 pt-10">
          <Icon name="cash-plus" size={42} tone="textMuted" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Todavía no hay ingresos</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Los pagos de los pedidos aparecen solos. Anota aquí lo que entra por fuera, como una venta a un café.
          </Text>
          <View className="mt-5 w-full">
            <Button label="Anotar ingreso" icon={<Icon name="plus" size={18} tone="onPrimary" />} onPress={onNew} />
          </View>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={({ item }) => (
            <IncomeItemRow
              item={item}
              now={now}
              onPress={() => (item.kind === "manual" ? setVoiding(item) : onOpenOrder(String(item.orderId)))}
            />
          )}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          onEndReached={() => {
            if (online && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
      {voiding ? (
        <VoidIncomeSheet
          item={voiding}
          onClose={() => setVoiding(null)}
          onDone={(text) => {
            setVoiding(null);
            setMessage(text);
          }}
        />
      ) : null}
      {message ? <Toast message={message} onHide={hideMessage} /> : null}
    </View>
  );
}
