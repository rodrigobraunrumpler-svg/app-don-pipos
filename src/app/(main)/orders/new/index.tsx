import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { DraftItemsStep } from "@/features/orders";

// navigate y no push: dos toques seguidos en «Seguir» abren un solo paso 2
export default function NewOrderItems() {
  return (
    <Screen>
      <DraftItemsStep onBack={() => router.back()} onNext={() => router.navigate("/orders/new/details")} />
    </Screen>
  );
}
