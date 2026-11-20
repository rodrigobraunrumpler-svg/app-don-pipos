import { useInfiniteQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";
import { formatCents } from "@/lib/money";

import { receivablesQuery } from "../queries/orders";

// Más → Tu negocio: «Por cobrar», con lo que te deben en total
export function ReceivablesRow({ onPress }: { onPress: () => void }) {
  const due = useInfiniteQuery(receivablesQuery).data?.pages[0]?.meta.totalDueCents;
  return (
    <MenuRow
      icon="hand-coin-outline"
      label="Por cobrar"
      value={due === undefined ? null : formatCents(due)}
      onPress={onPress}
    />
  );
}
