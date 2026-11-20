import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { Receivables } from "@/features/orders";

export default function ReceivablesScreen() {
  return (
    <Screen>
      <Receivables
        onBack={() => router.back()}
        onOpen={(id) => router.navigate({ pathname: "/orders/[id]", params: { id } })}
      />
    </Screen>
  );
}
