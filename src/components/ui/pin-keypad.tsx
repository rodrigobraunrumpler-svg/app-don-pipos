import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "./icon";

const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

type Props = { onDigit: (digit: string) => void; onDelete: () => void; left?: ReactNode; disabled?: boolean };

// El teclado del PIN, abajo de la pantalla: del 1 al 9, lo que vaya a la izquierda del 0 (la huella), el 0 y borrar
export function PinKeypad({ onDigit, onDelete, left, disabled = false }: Props) {
  const digitKey = (digit: string) => (
    <Pressable
      key={digit}
      accessibilityRole="button"
      accessibilityLabel={digit}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onDigit(digit)}
      className="h-12 flex-1 items-center justify-center rounded-sm bg-surface active:bg-caramel-soft"
    >
      <Text className="font-bold text-2xl text-text">{digit}</Text>
    </Pressable>
  );

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel="Teclado numérico"
      className={`gap-1.5 border-t border-border bg-sunken px-3.5 pb-5 pt-2 ${disabled ? "opacity-45" : ""}`}
    >
      {ROWS.map((row) => (
        <View key={row.join("")} className="flex-row gap-1.5">
          {row.map(digitKey)}
        </View>
      ))}
      <View className="flex-row gap-1.5">
        <View className="h-12 flex-1 items-center justify-center">{left}</View>
        {digitKey("0")}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onDelete}
          className="h-12 flex-1 items-center justify-center rounded-sm"
        >
          <Icon name="backspace-outline" tone="textSecondary" />
        </Pressable>
      </View>
    </View>
  );
}
