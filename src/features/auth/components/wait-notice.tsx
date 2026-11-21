import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { businessDate, daysBetween, formatTime } from "@/lib/dates";

import { SupportLink } from "./support-link";

// Cada 5 PIN equivocados seguidos, la espera que pone el servidor: 15 minutos, 1 hora y después 24 horas. Dice hasta
// cuándo, con la hora de Lima («mañana» si termina otro día)
export function WaitNotice({ retryAt, onBack }: { retryAt: Date; onBack: () => void }) {
  const tomorrow = daysBetween(businessDate(new Date()), businessDate(retryAt)) > 0;
  const time = formatTime(retryAt);
  // «a la 01:20», «a las 12:40»
  const at = time.startsWith("01") ? "la" : "las";
  return (
    <View className="flex-1 bg-background px-5 pt-[30px]">
      <View className="h-[92px] w-[92px] items-center justify-center self-center rounded-full bg-caramel-soft">
        <Icon name="timer-outline" size={42} tone="accent" />
      </View>
      <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
        {`Espera hasta ${tomorrow ? `mañana a ${at}` : at} ${time}`}
      </Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">
        Hubo varios intentos con un PIN equivocado. Por seguridad, cada vez la espera es más larga.
      </Text>
      <View className="mt-[22px]">
        <SupportLink label="Pedir un PIN nuevo al equipo" variant="secondary" />
      </View>
      <Button label="Volver" variant="text" onPress={onBack} />
    </View>
  );
}
