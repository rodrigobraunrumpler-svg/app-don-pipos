import { router, type Href } from "expo-router";
import { View } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { Screen } from "@/components/ui/screen";
import { ordersKeys } from "@/features/orders";
import { RemindersBell } from "@/features/reminders";
import { FirstTip, HomeScreen, reportsKeys } from "@/features/reports";
import { stockKeys } from "@/features/stock";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// Inicio: lo urgente, lo cobrado hoy, tu stock, qué producir y los pedidos del día, y el consejo de la primera vez.
// Arriba a la derecha, el ⚙ de Ajustes (fase 7c) y la campana. Al volver, recarga lo que envejeció
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
        headerAction={
          <View className="flex-row items-center">
            <IconButton icon="cog-outline" label="Ajustes" onPress={() => router.navigate("/settings")} />
            <RemindersBell onOpen={(href) => router.navigate(href as Href)} />
          </View>
        }
      />
      <FirstTip />
    </Screen>
  );
}
