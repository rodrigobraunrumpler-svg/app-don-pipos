import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { SavedOrder } from "@/features/orders";

export default function SavedOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen>
      <SavedOrder orderId={id} onAnother={() => router.replace("/orders/new")} />
    </Screen>
  );
}
