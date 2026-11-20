import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { NewOrder } from "@/features/orders";

export default function NewOrderScreen() {
  return (
    <Screen>
      <NewOrder onBack={() => router.back()} />
    </Screen>
  );
}
