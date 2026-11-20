import { useQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";
import { formatCents } from "@/lib/money";

import { expensesSummaryQuery } from "../queries/expenses";
import { monthRange } from "../rules/expense";

// Más → Tu negocio: «Gastos», con lo gastado en el mes
export function ExpensesRow({ onPress }: { onPress: () => void }) {
  const month = monthRange(new Date());
  const total = useQuery(expensesSummaryQuery(month.from, month.to)).data?.totalCents;
  return (
    <MenuRow
      icon="receipt-text-outline"
      label="Gastos"
      value={total === undefined ? null : formatCents(total)}
      onPress={onPress}
    />
  );
}
