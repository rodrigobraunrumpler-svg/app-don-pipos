import { router } from "expo-router";

import { Screen } from "@/components/ui/screen";
import { MessagesScreen } from "@/features/messages";

export default function Messages() {
  return (
    <Screen>
      <MessagesScreen onBack={() => router.back()} />
    </Screen>
  );
}
