import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { IncomeForm } from "@/features/income";

export default function NewIncome() {
  return (
    <Screen>
      <IncomeForm onBack={() => router.back()} />
    </Screen>
  );
}
