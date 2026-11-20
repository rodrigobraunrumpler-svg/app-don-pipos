import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { OrderList, ordersKeys } from "@/features/orders";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

export default function Orders() {
  useRefreshOnFocus(ordersKeys.all);
  return (
    <Screen bottom={false}>
      <OrderList
        onOpen={(id) => router.navigate({ pathname: "/orders/[id]", params: { id } })}
        onNew={() => router.navigate("/orders/new")}
        onReceivables={() => router.navigate("/orders/receivables")}
      />
    </Screen>
  );
}
