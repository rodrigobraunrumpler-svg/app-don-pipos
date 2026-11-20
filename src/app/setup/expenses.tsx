import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { SetupExpensesStep } from "@/features/businesses";

export default function SetupExpenses() {
  return (
    <Screen>
      <SetupExpensesStep
        onBack={() => router.back()}
        onDone={(alreadyDone) =>
          router.navigate({ pathname: "/setup/done", params: alreadyDone ? { already: "1" } : {} })
        }
      />
    </Screen>
  );
}
