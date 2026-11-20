import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { SetupExpensesStep } from "@/features/businesses";

export default function SetupExpenses() {
  return (
    <Screen>
      <SetupExpensesStep onBack={() => router.back()} onDone={() => router.navigate("/setup/done")} />
    </Screen>
  );
}
