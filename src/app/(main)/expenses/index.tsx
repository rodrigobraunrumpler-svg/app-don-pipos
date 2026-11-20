import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ExpensesOverview } from "@/features/expenses";

export default function ExpensesScreen() {
  return (
    <Screen>
      <ExpensesOverview onBack={() => router.back()} onNew={() => router.navigate("/expenses/new")} />
    </Screen>
  );
}
