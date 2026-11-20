import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ReportsScreen, reportsKeys } from "@/features/reports";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

export default function Reports() {
  useRefreshOnFocus(reportsKeys.all);
  return (
    <Screen>
      <ReportsScreen
        onBack={() => router.back()}
        onRanking={(period) => router.navigate({ pathname: "/reports/ranking", params: period })}
      />
    </Screen>
  );
}
