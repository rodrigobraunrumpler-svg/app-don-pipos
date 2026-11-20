import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui/notice";
import { ordersKeys, type OrderFilter } from "@/features/orders";
import { stockKeys } from "@/features/stock";
import { formatLongDate } from "@/lib/dates";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { reportsKeys } from "../queries/keys";
import { homeSummaryQuery } from "../queries/reports";
import { greeting } from "../rules/greeting";
import { loadedWhen } from "../rules/loaded";
import { CollectedToday } from "./collected-today";
import { HomeOrders } from "./home-orders";
import { HomeSuggestion } from "./home-suggestion";
import { HomeUrgent } from "./home-urgent";
import { StockTray } from "./stock-tray";

type Props = {
  onOpenOrder: (orderId: string) => void;
  onOrders: (filter: OrderFilter) => void;
  onReceivables: () => void;
  onCash: () => void;
  onStock: () => void;
  onProduct: (productId: string) => void;
  onProduction: () => void;
  onNewOrder: () => void;
};

// Inicio (inicio de la maqueta): el saludo, lo urgente, lo cobrado hoy con los números del día, tu stock, qué producir y
// los pedidos por entregar y próximos. Cada parte carga por su cuenta: si una falla, las demás se ven
export function HomeScreen({
  onOpenOrder,
  onOrders,
  onReceivables,
  onCash,
  onStock,
  onProduct,
  onProduction,
  onNewOrder,
}: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { dataUpdatedAt } = useQuery(homeSummaryQuery);
  // La rueda de recarga, solo mientras el dueño tira hacia abajo
  const [pulling, setPulling] = useState(false);
  const now = new Date();
  // Sin señal: de cuándo es lo que se ve; sin nada guardado, que llega con la señal
  const offline = dataUpdatedAt
    ? `Sin conexión. Ves lo último que se cargó, ${loadedWhen(new Date(dataUpdatedAt), now)}.`
    : "Sin conexión. Lo de hoy se carga cuando vuelva la señal.";

  function refresh() {
    setPulling(true);
    void Promise.all(
      [reportsKeys.all, ordersKeys.all, stockKeys.all].map((queryKey) =>
        queryClient.refetchQueries({ queryKey, type: "active" }),
      ),
    ).finally(() => setPulling(false));
  }

  return (
    <ScrollView
      contentContainerClassName="px-5 pb-8 pt-3"
      refreshControl={
        <RefreshControl refreshing={pulling} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <View className="flex-row items-center gap-2.5">
        <Logo size="tiny" />
        <Text className="font-extrabold text-lg text-text">Don Pipos</Text>
      </View>
      {online ? null : <Notice>{offline}</Notice>}
      <View className="mt-3.5">
        <Text accessibilityRole="header" className="font-extrabold text-[25px] text-text">
          {greeting(now)}
        </Text>
        <Text className="mt-0.5 text-base text-text-secondary">{formatLongDate(now)}</Text>
      </View>
      <HomeUrgent
        now={now}
        onOpenOrder={onOpenOrder}
        onOrders={onOrders}
        onProduct={onProduct}
        onProduction={onProduction}
      />
      <CollectedToday onCash={onCash} onOrders={onOrders} onReceivables={onReceivables} />
      <StockTray onProduct={onProduct} onStock={onStock} />
      <HomeSuggestion onProduction={onProduction} />
      <HomeOrders now={now} onOpenOrder={onOpenOrder} onOrders={onOrders} onNewOrder={onNewOrder} />
    </ScrollView>
  );
}
