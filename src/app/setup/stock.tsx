import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { SetupStockStep } from "@/features/businesses";

export default function SetupStock() {
  return (
    <Screen>
      <SetupStockStep onBack={() => router.back()} onNext={() => router.navigate("/setup/expenses")} />
    </Screen>
  );
}
