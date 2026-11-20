import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ExpenseForm } from "@/features/expenses";

export default function NewExpense() {
  return (
    <Screen>
      <ExpenseForm onBack={() => router.back()} />
    </Screen>
  );
}
