import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { IncomeOverview } from "@/features/income";

export default function IncomeScreen() {
  return (
    <Screen>
      <IncomeOverview
        onBack={() => router.back()}
        onNew={() => router.navigate("/income/new")}
        onOpenOrder={(id) => router.navigate({ pathname: "/orders/[id]", params: { id } })}
      />
    </Screen>
  );
}
