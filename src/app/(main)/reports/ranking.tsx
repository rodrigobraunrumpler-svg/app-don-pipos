import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { periodRange, RankingScreen, reportsKeys } from "@/features/reports";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// Alfajores del periodo que venía en Reportes. Sin él (un enlace suelto), el mes en curso
export default function Ranking() {
  useRefreshOnFocus(reportsKeys.all);
  const params = useLocalSearchParams<{ from?: string; to?: string; label?: string }>();
  const month = periodRange("month", new Date());
  const period = params.from && params.to ? { from: params.from, to: params.to, label: params.label ?? "" } : month;
  return (
    <Screen>
      <RankingScreen
        from={period.from}
        to={period.to}
        label={period.label}
        onBack={() => router.back()}
        onProducts={() => router.navigate("/more/products")}
      />
    </Screen>
  );
}
