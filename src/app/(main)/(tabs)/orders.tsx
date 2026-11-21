import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { MenuSection } from "@/components/ui/menu-section";
import { Screen } from "@/components/ui/screen";
import { ScreenTitle } from "@/components/ui/screen-title";
import { Segmented } from "@/components/ui/segmented";
import { LapsedRow } from "@/features/businesses";
import { CustomersScreen, customersKeys } from "@/features/customers";
import { LoyaltyRow } from "@/features/loyalty";
import { MessageButton } from "@/features/messages";
import { OrderList, ordersKeys } from "@/features/orders";
import { formatLongDate } from "@/lib/dates";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

type Shown = "orders" | "customers";

// La pestaña Pedidos, con «Pedidos | Clientes» arriba (fase 7c: Clientes salió de Más). Arriba de los clientes, la
// fidelidad y desde cuándo un cliente «no vuelve»; en «No vuelven», «Escribirle» abre WhatsApp con «te extrañamos»
export default function Orders() {
  useRefreshOnFocus(ordersKeys.all);
  useRefreshOnFocus(customersKeys.all);
  // «Pedidos | Clientes» vive en la ruta (?view=customers): sigue elegido al volver de la ficha de un cliente aunque la
  // pantalla se vuelva a armar
  const { filter, view } = useLocalSearchParams<{ filter?: string; view?: string }>();
  const shown: Shown = view === "customers" ? "customers" : "orders";
  const navigation = useNavigation<{ setParams: (params: { filter?: string; view?: string }) => void }>();
  const show = (next: Shown) => navigation.setParams({ view: next === "customers" ? next : undefined });
  // Clientes se arma la primera vez que se mira y después queda armado, como los pedidos: cambiar de vista no pierde el
  // filtro ni la búsqueda de ninguna de las dos
  const [customersOpened, setCustomersOpened] = useState(shown === "customers");
  if (shown === "customers" && !customersOpened) setCustomersOpened(true);
  // El filtro llega una vez y se borra de la ruta: así el siguiente toque en Inicio lo vuelve a poner, y volver a la
  // pestaña no pisa el que eligió el dueño. Con la navegación de esta pantalla: el router global no existe todavía si la
  // app abre directo aquí. Un filtro siempre muestra los pedidos, aunque se estuvieran mirando los clientes
  useEffect(() => {
    if (filter) navigation.setParams({ filter: undefined, view: undefined });
  }, [filter, navigation]);
  const header = (
    <ScreenTitle title="Pedidos" subtitle={formatLongDate(new Date())}>
      <Segmented<Shown>
        label="Ver pedidos o clientes"
        options={[
          ["orders", "Pedidos"],
          ["customers", "Clientes"],
        ]}
        value={shown}
        onChange={show}
      />
    </ScreenTitle>
  );
  return (
    <Screen bottom={false}>
      <View style={{ flex: 1, display: shown === "orders" ? "flex" : "none" }}>
        <OrderList
          header={header}
          requestedFilter={filter}
          onOpen={(id) => router.navigate({ pathname: "/orders/[id]", params: { id } })}
          onNew={() => router.navigate("/orders/new")}
          onReceivables={() => router.navigate("/orders/receivables")}
        />
      </View>
      {customersOpened ? (
        <View style={{ flex: 1, display: shown === "customers" ? "flex" : "none" }}>
          <CustomersScreen
            header={header}
            shortcuts={
              <MenuSection>
                <LoyaltyRow onPress={() => router.navigate("/settings/loyalty")} />
                <LapsedRow />
              </MenuSection>
            }
            onOpen={(id) => router.navigate({ pathname: "/customers/[id]", params: { id } })}
            lapsedAction={(customer) =>
              customer.phone ? (
                <MessageButton
                  templateKey="we_miss_you"
                  context={{ nombre: customer.name.replace(/ .*/, "") }}
                  phone={customer.phone}
                  label="Escribirle"
                />
              ) : null
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}
