import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { OrderDetail } from "@/features/orders";

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen bottom={false}>
      <OrderDetail orderId={id} onBack={() => router.back()} />
    </Screen>
  );
}
