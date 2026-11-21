import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { LoyaltyScreen } from "@/features/loyalty";

export default function Loyalty() {
  return (
    <Screen>
      <LoyaltyScreen onBack={() => router.back()} />
    </Screen>
  );
}
