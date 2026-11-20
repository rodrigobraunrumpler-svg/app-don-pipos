import { useQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";
import { businessDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { incomeSummaryQuery } from "../queries/income";

// Más → Tu negocio: «Ingresos», con lo cobrado en el mes
export function IncomeRow({ onPress }: { onPress: () => void }) {
  const today = businessDate(new Date());
  const total = useQuery(incomeSummaryQuery(`${today.slice(0, 8)}01`, today)).data?.totalCents;
  return (
    <MenuRow
      icon="cash-plus"
      label="Ingresos"
      value={total === undefined ? null : formatCents(total)}
      onPress={onPress}
    />
  );
}
