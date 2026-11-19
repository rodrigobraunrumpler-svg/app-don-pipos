import { Text, View } from "react-native";

import { Logo } from "@/components/ui/logo";
import { Screen } from "@/components/ui/screen";
import { formatLongDate } from "@/lib/dates";

// Inicio: por ahora el nombre y la fecha de hoy. Lo urgente del día llega en la fase 6
export default function Home() {
  return (
    <Screen bottom={false}>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Logo />
        <Text className="font-extrabold text-3xl text-text">Don Pipos</Text>
        <Text className="font-regular text-sm text-text-muted">{formatLongDate(new Date())}</Text>
      </View>
    </Screen>
  );
}
