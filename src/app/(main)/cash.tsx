import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { CashCountView } from "@/features/cash";

export default function CashScreen() {
  return (
    <Screen>
      <CashCountView onBack={() => router.back()} />
    </Screen>
  );
}
