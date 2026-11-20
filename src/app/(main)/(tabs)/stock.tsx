import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { StockOverview, stockOverviewQuery } from "@/features/stock";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

export default function Stock() {
  useRefreshOnFocus(stockOverviewQuery.queryKey);
  return (
    <Screen bottom={false}>
      <StockOverview
        onOpenProduct={(productId) => router.push({ pathname: "/stock/[productId]", params: { productId } })}
        onRegisterProduction={() => router.push("/stock/production")}
        onGoToProducts={() => router.push("/more/products")}
      />
    </Screen>
  );
}
