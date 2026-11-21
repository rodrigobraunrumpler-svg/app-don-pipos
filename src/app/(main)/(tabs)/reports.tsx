import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ReportsScreen, reportsKeys } from "@/features/reports";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// Reportes, una pestaña (en el lugar de Más, fase 7c). Sus alfajores, sus gastos y sus ingresos se abren encima
export default function Reports() {
  useRefreshOnFocus(reportsKeys.all);
  return (
    <Screen bottom={false}>
      <ReportsScreen
        onRanking={(period) => router.navigate({ pathname: "/reports/ranking", params: period })}
        onIncome={() => router.navigate("/income")}
        onExpenses={() => router.navigate("/expenses")}
      />
    </Screen>
  );
}
