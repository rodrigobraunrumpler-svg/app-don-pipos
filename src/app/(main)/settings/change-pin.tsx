import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { ChangePinFlow } from "@/features/auth";

export default function ChangePin() {
  return (
    <Screen>
      <ChangePinFlow onDone={() => router.back()} />
    </Screen>
  );
}
