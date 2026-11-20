import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { Screen } from "@/components/ui/screen";
import { SkeletonRows } from "@/components/ui/skeleton";
import { CustomerCard, customerQuery, customersKeys, formatPhone } from "@/features/customers";
import { loyaltySettingsQuery, StampsCard } from "@/features/loyalty";
import { CustomerOrders, ordersKeys } from "@/features/orders";
import { formatTime } from "@/lib/dates";
import { useOnline } from "@/lib/use-online";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

// La ficha del cliente: la arma esta pantalla con sus datos (customers), su tarjeta de sellos (loyalty, con la fidelidad
// encendida) y sus pedidos (orders). Borrar sus datos también refresca los pedidos, que dejan de tener su nombre
export default function CustomerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useRefreshOnFocus(customersKeys.all);
  const online = useOnline();
  const customer = useQuery(customerQuery(id));
  const loyalty = useQuery(loyaltySettingsQuery).data;
  const data = customer.data;
  return (
    <Screen>
      <FormHeader
        title={data?.name ?? "Cliente"}
        subtitle={data?.phone ? formatPhone(data.phone) : undefined}
        onBack={() => router.back()}
      />
      {!data && customer.isError ? (
        <LoadError what="la ficha" onRetry={() => void customer.refetch()} />
      ) : !data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={4} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 px-5 pb-8">
          {online ? null : (
            <Notice>{`Sin conexión. Ves la ficha de las ${formatTime(new Date(customer.dataUpdatedAt))}.`}</Notice>
          )}
          <CustomerCard
            customer={data}
            alsoRefresh={[ordersKeys.all]}
            stamps={loyalty?.isActive ? <StampsCard rule={loyalty} stamps={data.stamps} /> : null}
            orders={
              <CustomerOrders
                customerId={data.id}
                onOpen={(orderId) => router.navigate({ pathname: "/orders/[id]", params: { id: orderId } })}
              />
            }
          />
        </ScrollView>
      )}
    </Screen>
  );
}
