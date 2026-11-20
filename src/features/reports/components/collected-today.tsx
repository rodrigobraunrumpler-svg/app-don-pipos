import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";

import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/features/businesses";
import type { OrderFilter } from "@/features/orders";
import { formatCents } from "@/lib/money";

import { METHOD_COLORS } from "../constants";
import { homeSummaryQuery } from "../queries/reports";
import { DayNumber } from "./day-number";
import { PartError } from "./part-error";

type Props = { onCash: () => void; onOrders: (filter: OrderFilter) => void; onReceivables: () => void };

// «Cobrado hoy» (hero de la maqueta): el total, la barra y los medios sin los que están en cero, «Cuadrar caja ›» y los
// números del día, que abren Pedidos con su filtro o Por cobrar
export function CollectedToday({ onCash, onOrders, onReceivables }: Props) {
  const { data, isError, refetch } = useQuery(homeSummaryQuery);
  if (!data && isError) return <PartError what="lo cobrado hoy" onRetry={() => void refetch()} />;
  if (!data)
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Cargando" className="mt-4 h-44 rounded-lg bg-sunken" />
    );
  // Los medios en cero no salen; uno en negativo (una devolución de hoy) sí, para que la suma cuadre. La barra, solo lo
  // que entró
  const methods = PAYMENT_METHODS.filter((method) => data.collectedByMethod[method] !== 0);
  const inBar = methods.filter((method) => data.collectedByMethod[method] > 0);
  const empty = !data.collectedTodayCents && !data.deliveredToday && !data.toDeliver && !data.receivablesCents;
  const cashLabel = data.cashClosedToday ? "Caja cerrada" : "Cuadrar caja";
  return (
    <View className="mt-4 rounded-lg bg-brand px-5 pb-4 pt-5">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-sm text-on-primary opacity-80">Cobrado hoy</Text>
        {empty ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cashLabel}
            onPress={onCash}
            className="min-h-11 justify-center"
          >
            <Text className="font-bold text-sm text-on-primary">{`${cashLabel} ›`}</Text>
          </Pressable>
        )}
      </View>
      <Text className="font-extrabold text-[40px] leading-[44px] text-on-primary">
        {formatCents(data.collectedTodayCents)}
      </Text>
      {empty ? (
        <Text className="mt-3 text-sm text-on-primary opacity-85">
          Todavía no hay pedidos hoy. Lo cobrado aparece aquí, separado por medio de pago.
        </Text>
      ) : (
        <>
          {methods.length > 0 ? (
            <View className="mt-4">
              <View className="h-2 flex-row overflow-hidden rounded-full">
                {inBar.map((method) => (
                  <View
                    key={method}
                    style={{ flex: data.collectedByMethod[method] }}
                    className={METHOD_COLORS[method]}
                  />
                ))}
              </View>
              <View className="mt-3 flex-row flex-wrap gap-y-1.5">
                {methods.map((method) => (
                  <View key={method} className="w-1/2 flex-row items-center gap-2 pr-4">
                    <View className={`h-2.5 w-2.5 rounded-full ${METHOD_COLORS[method]}`} />
                    <Text numberOfLines={1} className="shrink text-[13px] text-on-primary opacity-85">
                      {PAYMENT_METHOD_LABELS[method]}
                    </Text>
                    <Text className="ml-auto font-bold text-[13px] text-on-primary">
                      {formatCents(data.collectedByMethod[method])}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          <View className="mt-4 h-px bg-on-primary opacity-20" />
          <View className="mt-2 flex-row justify-between">
            <View className="flex-row gap-5">
              <DayNumber
                value={String(data.deliveredToday)}
                text="entregados"
                label={`${data.deliveredToday} entregados hoy`}
                onPress={() => onOrders("today")}
              />
              <DayNumber
                value={String(data.toDeliver)}
                text="por entregar"
                label={`${data.toDeliver} por entregar`}
                onPress={() => onOrders("to_deliver")}
              />
            </View>
            <DayNumber
              value={formatCents(data.receivablesCents)}
              text="por cobrar"
              label={`${formatCents(data.receivablesCents)} por cobrar`}
              onPress={onReceivables}
            />
          </View>
        </>
      )}
    </View>
  );
}
