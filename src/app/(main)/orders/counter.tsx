import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { CounterSale } from "@/features/orders";

export default function CounterSaleScreen() {
  return (
    <Screen bottom={false}>
      <CounterSale onBack={() => router.back()} />
    </Screen>
  );
}
