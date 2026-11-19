import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatTime } from "@/lib/dates";

import { SupportLink } from "./support-link";

// Después de 5 PIN equivocados: la espera de 15 minutos que pone el servidor
export function WaitNotice({ retryAt, onBack }: { retryAt: Date; onBack: () => void }) {
  return (
    <View className="flex-1 bg-background px-5 pt-[30px]">
      <View className="h-[92px] w-[92px] items-center justify-center self-center rounded-full bg-caramel-soft">
        <Icon name="timer-outline" size={42} tone="accent" />
      </View>
      <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
        Espera 15 minutos
      </Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">
        {`Hubo 5 intentos con un PIN equivocado. Por seguridad, podrás intentarlo otra vez a las ${formatTime(retryAt)}.`}
      </Text>
      <View className="mt-[22px]">
        <SupportLink label="Pedir un PIN nuevo al equipo" variant="secondary" />
      </View>
      <Text className="mt-3.5 text-center text-[13px] text-text-muted">
        Con 10 intentos fallidos, la cuenta queda bloqueada hasta que el equipo la revise.
      </Text>
      <Button label="Volver" variant="text" onPress={onBack} />
    </View>
  );
}
