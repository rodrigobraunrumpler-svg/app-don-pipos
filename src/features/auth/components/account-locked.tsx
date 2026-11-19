import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { SupportLink } from "./support-link";

// Después de 10 PIN equivocados: la cuenta queda bloqueada hasta que el equipo la revise.
// «Volver», por si el número estaba mal escrito
export function AccountLocked({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-1 bg-background px-5 pt-[30px]">
      <View className="h-[92px] w-[92px] items-center justify-center self-center rounded-full bg-caramel-soft">
        <Icon name="lock-outline" size={42} tone="accent" />
      </View>
      <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
        Tu cuenta está bloqueada
      </Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">
        Hubo 10 intentos con un PIN equivocado. Escribe al equipo para revisarla.
      </Text>
      <View className="mt-[22px]">
        <SupportLink label="Pedir un PIN nuevo al equipo" variant="secondary" />
      </View>
      <Button label="Volver" variant="text" onPress={onBack} />
    </View>
  );
}
