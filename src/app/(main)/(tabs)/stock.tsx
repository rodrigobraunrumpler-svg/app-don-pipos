import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { StockOverview, stockOverviewQuery } from "@/features/stock";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

export default function Stock() {
  useRefreshOnFocus(stockOverviewQuery.queryKey);
  return (
    <Screen bottom={false}>
      <StockOverview
        onOpenProduct={(productId) => router.navigate({ pathname: "/stock/[productId]", params: { productId } })}
        onRegisterProduction={() => router.navigate("/stock/production")}
        onGoToProducts={() => router.navigate("/more/products")}
      />
    </Screen>
  );
}
