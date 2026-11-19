import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Notice } from "@/components/ui/notice";
import { errorMessage, toAppError } from "@/lib/errors";

import { PIN_LENGTH } from "../constants";
import { useUnlock } from "../hooks/use-unlock";
import { changePinMutation } from "../queries/mutations";
import { attemptsLabel } from "../rules/attempts";
import { pinIsObvious } from "../rules/pin";
import { AccountLocked } from "./account-locked";
import { PinScreen } from "./pin-screen";
import { WaitNotice } from "./wait-notice";

type Step = "current" | "next" | "repeat" | "done";
const TITLES: Record<Exclude<Step, "done">, string> = {
  current: "Tu PIN actual",
  next: "Tu PIN nuevo",
  repeat: "Repite tu PIN nuevo",
};
const OBVIOUS = "Ese PIN es fácil de adivinar. Elige otro.";
const SAME = "Es el mismo PIN que ya tienes.";

// Cambiar el PIN en tres pasos, con el mismo teclado. Lo que se puede revisar en el celular se avisa antes de enviar
export function ChangePinFlow({ onDone }: { onDone: () => void }) {
  const { phone, rememberPin } = useUnlock();
  const change = useMutation(changePinMutation);
  const [step, setStep] = useState<Step>("current");
  const [entry, setEntry] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [blocked, setBlocked] = useState<{ kind: "locked"; retryAt: Date } | { kind: "hard" } | null>(null);

  function goTo(target: Step, text: string | null = null) {
    setStep(target);
    setEntry("");
    setMessage(text);
  }

  async function send(chosen: string) {
    try {
      const result = await change.mutateAsync({ current, next: chosen });
      if (result.status === "ok") {
        await rememberPin(chosen);
        goTo("done");
      } else if (result.status === "wrong_pin")
        goTo("current", `PIN incorrecto. ${attemptsLabel(result.attemptsLeft)}.`);
      else if (result.status === "same_pin") goTo("next", SAME);
      else if (result.status === "obvious_pin") goTo("next", OBVIOUS);
      else setBlocked(result.status === "locked" ? { kind: "locked", retryAt: result.retryAt } : { kind: "hard" });
    } catch (error) {
      setOffline(toAppError(error).kind === "offline");
      goTo("repeat", toAppError(error).kind === "offline" ? null : errorMessage(error));
    }
  }

  function complete(value: string) {
    if (step === "current") {
      setCurrent(value);
      goTo("next");
    } else if (step === "next") {
      if (pinIsObvious(value, phone ?? "")) goTo("next", OBVIOUS);
      else if (value === current) goTo("next", SAME);
      else {
        setNext(value);
        goTo("repeat");
      }
    } else if (value !== next) goTo("next", "Los dos PIN no coinciden.");
    else {
      setEntry("");
      void send(value);
    }
  }

  function press(digit: string) {
    if (change.isPending || entry.length >= PIN_LENGTH) return;
    const value = entry + digit;
    setEntry(value);
    setMessage(null);
    setOffline(false);
    if (value.length === PIN_LENGTH) complete(value);
  }

  if (blocked?.kind === "locked") return <WaitNotice retryAt={blocked.retryAt} onBack={onDone} />;
  if (blocked?.kind === "hard") return <AccountLocked />;
  if (step === "done") {
    return (
      <View className="flex-1 bg-background px-5 pt-[60px]">
        <View className="h-[92px] w-[92px] items-center justify-center self-center rounded-full bg-caramel-soft">
          <Icon name="key-variant" size={42} tone="accent" />
        </View>
        <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
          Listo, cambiaste tu PIN
        </Text>
        <Text className="mt-1.5 text-center text-base text-text-secondary">Desde ahora entras con el nuevo.</Text>
        <View className="mt-[22px]">
          <Button label="Volver" onPress={onDone} />
        </View>
      </View>
    );
  }

  return (
    <PinScreen
      title={TITLES[step]}
      filled={entry.length}
      error={message !== null}
      message={
        <>
          {offline ? <Notice>Sin conexión. Para cambiar el PIN necesitas internet.</Notice> : null}
          {message ? <Text className="mt-[26px] text-center font-bold text-sm text-danger">{message}</Text> : null}
        </>
      }
      disabled={change.isPending}
      onDigit={press}
      onDelete={() => setEntry((value) => value.slice(0, -1))}
    />
  );
}
