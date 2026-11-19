import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { Logo } from "@/components/ui/logo";
import { PinDots } from "@/components/ui/pin-dots";
import { PinKeypad } from "@/components/ui/pin-keypad";

type Props = {
  title: string;
  subtitle?: string;
  logo?: boolean;
  filled: number;
  error?: boolean;
  message?: ReactNode;
  children?: ReactNode;
  keypadLeft?: ReactNode;
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
};

// Una pantalla de PIN: título, puntos, el aviso que toque y el teclado abajo (Entrar y Cambiar PIN)
export function PinScreen({
  title,
  subtitle,
  logo = false,
  filled,
  error = false,
  message,
  children,
  keypadLeft,
  disabled,
  onDigit,
  onDelete,
}: Props) {
  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-5 pb-4 pt-1.5">
        {logo ? (
          <View className="mt-[18px]">
            <Logo size="small" />
          </View>
        ) : null}
        <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">{title}</Text>
        {subtitle ? <Text className="mt-1.5 text-center text-base text-text-secondary">{subtitle}</Text> : null}
        <View className="mt-7">
          <PinDots filled={filled} error={error} />
        </View>
        {message}
        {children}
      </ScrollView>
      <PinKeypad onDigit={onDigit} onDelete={onDelete} left={keypadLeft} disabled={disabled} />
    </View>
  );
}
