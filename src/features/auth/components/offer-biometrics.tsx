import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { useUnlock } from "../hooks/use-unlock";

// Después de ingresar, si el celular tiene huella
export function OfferBiometrics() {
  const { answerBiometricsOffer } = useUnlock();
  return (
    <View className="flex-1 bg-background px-5 pt-[60px]">
      <View className="h-[132px] w-[132px] items-center justify-center self-center rounded-full bg-caramel-soft">
        <Icon name="fingerprint" size={66} tone="accent" />
      </View>
      <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
        ¿Entrar con tu huella?
      </Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">
        Es lo más rápido. Si la huella falla, entras con tu PIN.
      </Text>
      <View className="mt-[22px]">
        <Button
          label="Usar mi huella"
          icon={<Icon name="fingerprint" size={19} tone="onPrimary" />}
          onPress={() => void answerBiometricsOffer(true)}
        />
      </View>
      <Button label="Ahora no" variant="text" onPress={() => void answerBiometricsOffer(false)} />
    </View>
  );
}
