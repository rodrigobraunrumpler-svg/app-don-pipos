import { Stack } from "expo-router";
import { useEffect } from "react";

import { clearNotifications } from "@/lib/notifications";

// Sin sesión: los avisos programados o a la vista se borran, porque llevan nombres de clientes
export default function AuthLayout() {
  useEffect(() => {
    void clearNotifications();
  }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}
