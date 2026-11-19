import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";

import { useUnlock } from "../hooks/use-unlock";

// Entrar con la huella: la pide al abrir, y el botón la vuelve a pedir
export function UnlockBiometrics({ onUsePin }: { onUsePin: () => void }) {
  const { unlockWithBiometrics } = useUnlock();
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void unlockWithBiometrics();
  }, [unlockWithBiometrics]);

  return (
    <View className="flex-1 bg-background px-5 pt-[60px]">
      <Logo />
      <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">Hola de nuevo</Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">Toca el sensor para entrar.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Entrar con huella"
        onPress={() => void unlockWithBiometrics()}
        className="mt-11 h-[132px] w-[132px] items-center justify-center self-center rounded-full bg-caramel-soft"
      >
        <Icon name="fingerprint" size={66} tone="accent" />
      </Pressable>
      <Text className="mt-[26px] text-center font-semibold text-sm text-text-secondary">
        Con tu huella entras en un segundo.
      </Text>
      <Button label="Usar mi PIN" variant="text" onPress={onUsePin} />
    </View>
  );
}
