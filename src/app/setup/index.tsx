import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { SetupProductsStep } from "@/features/businesses";

// navigate y no push: dos toques seguidos en «Siguiente» abren un solo paso
export default function SetupProducts() {
  return (
    <Screen>
      <SetupProductsStep onNext={() => router.navigate("/setup/stock")} />
    </Screen>
  );
}
