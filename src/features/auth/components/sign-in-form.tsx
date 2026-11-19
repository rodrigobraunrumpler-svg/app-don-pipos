import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Keyboard, ScrollView, Text, TextInput, View } from "react-native";

import { Logo } from "@/components/ui/logo";
import { Notice } from "@/components/ui/notice";
import { PinDots } from "@/components/ui/pin-dots";
import { PinKeypad } from "@/components/ui/pin-keypad";
import { errorMessage, toAppError } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { PIN_LENGTH } from "../constants";
import { useUnlock } from "../hooks/use-unlock";
import { signInMutation } from "../queries/mutations";
import { attemptsLabel } from "../rules/attempts";
import { phoneDigits } from "../rules/phone";
import { AccountLocked } from "./account-locked";
import { SupportLink } from "./support-link";
import { WaitNotice } from "./wait-notice";

type Problem =
  { kind: "wrong"; attemptsLeft: number } | { kind: "phone" } | { kind: "offline" } | { kind: "other"; text: string };
type Blocked = { kind: "locked"; retryAt: Date } | { kind: "hard" };

// Ingresar en un celular, en una sola pantalla: el número y el PIN; al sexto número se comprueba solo
export function SignInForm() {
  const { phone: knownPhone, rememberSignIn } = useUnlock();
  const { colors } = useTheme();
  const online = useOnline();
  const signIn = useMutation(signInMutation);
  const [phone, setPhone] = useState(knownPhone ? knownPhone.replace(/^\+51/, "") : "");
  const [pin, setPin] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const digits = phoneDigits(phone);

  async function submit(fullPin: string) {
    try {
      const result = await signIn.mutateAsync({ phone: digits, pin: fullPin });
      if (result.status === "ok") {
        await rememberSignIn(`+51${digits}`, fullPin);
        return;
      }
      setPin("");
      if (result.status === "wrong_pin") setProblem({ kind: "wrong", attemptsLeft: result.attemptsLeft });
      else setBlocked(result.status === "locked" ? { kind: "locked", retryAt: result.retryAt } : { kind: "hard" });
    } catch (error) {
      setPin("");
      setProblem(
        toAppError(error).kind === "offline" ? { kind: "offline" } : { kind: "other", text: errorMessage(error) },
      );
    }
  }

  function press(digit: string) {
    if (signIn.isPending || pin.length >= PIN_LENGTH) return;
    Keyboard.dismiss();
    const next = pin + digit;
    setProblem(null);
    if (next.length === PIN_LENGTH && digits.length !== 9) {
      setPin("");
      setProblem({ kind: "phone" });
      return;
    }
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  }

  if (blocked?.kind === "locked") return <WaitNotice retryAt={blocked.retryAt} onBack={() => setBlocked(null)} />;
  if (blocked?.kind === "hard") return <AccountLocked />;

  const offline = !online || problem?.kind === "offline";
  const status = signIn.isPending ? (
    <View accessibilityRole="progressbar" className="mt-2 flex-row items-center gap-2">
      <ActivityIndicator size="small" color={colors.textSecondary} />
      <Text className="font-semibold text-sm text-text-secondary">Comprobando…</Text>
    </View>
  ) : problem && problem.kind !== "offline" ? (
    <Text className="mt-2 font-bold text-sm text-danger">
      {problem.kind === "wrong"
        ? `PIN incorrecto. ${attemptsLabel(problem.attemptsLeft)}.`
        : problem.kind === "phone"
          ? "Escribe tu número: son 9 cifras."
          : problem.text}
    </Text>
  ) : null;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-5 pb-4 pt-2.5" keyboardShouldPersistTaps="handled">
        <View className="mt-[18px]">
          <Logo size="small" />
        </View>
        <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
          Ingresa a tu app
        </Text>
        <Text className="mt-1.5 text-center text-base text-text-secondary">
          Con tu número y el PIN que te dio el equipo.
        </Text>
        {offline ? <Notice>Sin conexión. Para ingresar la primera vez necesitas internet.</Notice> : null}
        <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Tu número</Text>
        <View className="min-h-[50px] flex-row items-center gap-2.5 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5">
          <Text className="font-extrabold text-base text-text-secondary">+51</Text>
          <TextInput
            accessibilityLabel="Número de celular"
            value={phone}
            onChangeText={setPhone}
            keyboardType="number-pad"
            maxLength={11}
            placeholder="900 000 000"
            placeholderTextColor={colors.textMuted}
            className="flex-1 font-bold text-base text-text"
          />
        </View>
        <Text className="mb-2 mt-3.5 font-extrabold text-sm text-text-secondary">Tu PIN</Text>
        <View
          className={`min-h-[50px] justify-center rounded-sm border-[1.5px] bg-surface px-3.5 ${problem?.kind === "wrong" ? "border-danger" : "border-accent"}`}
        >
          <PinDots filled={pin.length} error={problem?.kind === "wrong"} align="start" />
        </View>
        {status}
        <View className="mt-2">
          <SupportLink label="Olvidé mi PIN" />
        </View>
      </ScrollView>
      <PinKeypad
        onDigit={press}
        onDelete={() => setPin((current) => current.slice(0, -1))}
        disabled={!online || signIn.isPending}
      />
    </View>
  );
}
