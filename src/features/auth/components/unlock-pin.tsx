import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { PIN_LENGTH } from "../constants";
import { useUnlock } from "../hooks/use-unlock";
import { attemptsLabel } from "../rules/attempts";
import { PinScreen } from "./pin-screen";
import { SupportLink } from "./support-link";

// Entrar con el PIN del celular. Funciona sin internet
export function UnlockPin({ onUseBiometrics }: { onUseBiometrics?: () => void }) {
  const { unlockWithPin } = useUnlock();
  const [pin, setPin] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  async function press(digit: string) {
    if (checking || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    setAttemptsLeft(null);
    if (next.length < PIN_LENGTH) return;
    setChecking(true);
    const answer = await unlockWithPin(next);
    setChecking(false);
    setPin("");
    if (!answer.ok && answer.attemptsLeft > 0) setAttemptsLeft(answer.attemptsLeft);
  }

  const biometricsKey = onUseBiometrics ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Entrar con huella"
      onPress={onUseBiometrics}
      className="h-12 w-full items-center justify-center rounded-sm"
    >
      <Icon name="fingerprint" tone="textSecondary" />
    </Pressable>
  ) : undefined;

  return (
    <PinScreen
      logo
      title="Escribe tu PIN"
      subtitle="Para entrar a Don Pipos."
      filled={pin.length}
      error={attemptsLeft !== null}
      message={
        attemptsLeft !== null ? (
          <Text className="mt-[26px] text-center font-bold text-sm text-danger">{`PIN incorrecto. ${attemptsLabel(attemptsLeft)}.`}</Text>
        ) : null
      }
      keypadLeft={biometricsKey}
      disabled={checking}
      onDigit={(digit) => void press(digit)}
      onDelete={() => setPin((current) => current.slice(0, -1))}
    >
      <View className="mt-[18px]">
        <SupportLink label="Olvidé mi PIN" />
      </View>
    </PinScreen>
  );
}
