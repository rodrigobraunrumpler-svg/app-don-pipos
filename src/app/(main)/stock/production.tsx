import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ProductionForm } from "@/features/stock";

export default function Production() {
  return (
    <Screen bottom={false}>
      <ProductionForm onBack={() => router.back()} onSeeStock={() => router.back()} />
    </Screen>
  );
}
