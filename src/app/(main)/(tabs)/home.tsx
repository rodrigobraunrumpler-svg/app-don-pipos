import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ordersKeys } from "@/features/orders";
import { FirstTip, HomeScreen, reportsKeys } from "@/features/reports";
import { stockKeys } from "@/features/stock";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// Inicio: lo urgente, lo cobrado hoy, tu stock, qué producir y los pedidos del día, y el consejo de la primera vez.
// Al volver, recarga lo que envejeció
export default function Home() {
  useRefreshOnFocus(reportsKeys.all);
  useRefreshOnFocus(ordersKeys.all);
  useRefreshOnFocus(stockKeys.all);
  return (
    <Screen bottom={false}>
      <HomeScreen
        onOpenOrder={(id) => router.navigate({ pathname: "/orders/[id]", params: { id } })}
        onOrders={(filter) => router.navigate({ pathname: "/orders", params: { filter } })}
        onReceivables={() => router.navigate("/orders/receivables")}
        onCash={() => router.navigate("/cash")}
        onStock={() => router.navigate("/stock")}
        onProduct={(productId) => router.navigate({ pathname: "/stock/[productId]", params: { productId } })}
        onProduction={() => router.navigate("/stock/production")}
        onNewOrder={() => router.navigate("/orders/new")}
      />
      <FirstTip />
    </Screen>
  );
}
