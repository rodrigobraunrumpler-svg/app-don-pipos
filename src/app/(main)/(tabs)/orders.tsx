import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect } from "react";

import { Screen } from "@/components/ui/screen";
import { OrderList, ordersKeys } from "@/features/orders";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

export default function Orders() {
  useRefreshOnFocus(ordersKeys.all);
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const navigation = useNavigation<{ setParams: (params: { filter?: string }) => void }>();
  // El filtro llega una vez y se borra de la ruta: así el siguiente toque en Inicio lo vuelve a poner, y volver a la
  // pestaña no pisa el que eligió el dueño. Con la navegación de esta pantalla: el router global no existe todavía si la
  // app abre directo aquí
  useEffect(() => {
    if (filter) navigation.setParams({ filter: undefined });
  }, [filter, navigation]);
  return (
    <Screen bottom={false}>
      <OrderList
        requestedFilter={filter}
        onOpen={(id) => router.navigate({ pathname: "/orders/[id]", params: { id } })}
        onNew={() => router.navigate("/orders/new")}
        onReceivables={() => router.navigate("/orders/receivables")}
      />
    </Screen>
  );
}
