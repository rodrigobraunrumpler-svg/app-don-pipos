import { Pressable, ScrollView, Text } from "react-native";

import { FILTER_LABELS } from "../constants";
import type { OrderCounts, OrderFilter } from "../schema/order";

const COUNT_KEYS: Record<OrderFilter, keyof OrderCounts> = {
  today: "today",
  to_deliver: "toDeliver",
  to_collect: "toCollect",
  upcoming: "upcoming",
  all: "all",
};
const FILTERS = Object.keys(FILTER_LABELS) as OrderFilter[];

type Props = { filter: OrderFilter; counts: OrderCounts | undefined; onChange: (filter: OrderFilter) => void };

// Los filtros de la lista, cada uno con cuántos pedidos tiene (order_counts)
export function OrderFilters({ filter, counts, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
      {FILTERS.map((key) => {
        const selected = key === filter;
        const text = selected ? "text-on-primary" : "text-text";
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={FILTER_LABELS[key]}
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            className={`min-h-11 flex-row items-center gap-1.5 rounded-full border-[1.5px] px-4 ${selected ? "border-primary bg-primary" : "border-border-strong bg-surface"}`}
          >
            <Text className={`font-bold text-sm ${text}`}>{FILTER_LABELS[key]}</Text>
            {counts ? (
              <Text className={`font-extrabold text-sm ${text}`}>{String(counts[COUNT_KEYS[key]])}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
