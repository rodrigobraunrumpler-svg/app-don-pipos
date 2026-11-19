import { Pressable, Text, View } from "react-native";

import { Icon } from "./icon";

type Props = { value: number; onChange: (value: number) => void; label: string; min?: number; max?: number };

const BUTTON = "h-11 w-11 items-center justify-center rounded-full border-[1.5px]";

// El contador − número +: producción, merma, conteo y stock mínimo. En el límite, el botón se apaga
export function Stepper({ value, onChange, label, min = 0, max = 10_000 }: Props) {
  const canLess = value > min;
  const canMore = value < max;
  return (
    <View className="flex-row items-center gap-1.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Menos ${label}`}
        accessibilityState={{ disabled: !canLess }}
        disabled={!canLess}
        onPress={() => onChange(value - 1)}
        className={`${BUTTON} ${canLess ? "border-border-strong bg-surface" : "border-border bg-sunken"}`}
      >
        <Icon name="minus" size={20} tone={canLess ? "text" : "textMuted"} />
      </Pressable>
      <Text className="min-w-10 text-center font-extrabold text-lg text-text">{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Más ${label}`}
        accessibilityState={{ disabled: !canMore }}
        disabled={!canMore}
        onPress={() => onChange(value + 1)}
        className={`${BUTTON} ${canMore ? "border-primary bg-primary" : "border-border bg-sunken"}`}
      >
        <Icon name="plus" size={20} tone={canMore ? "onPrimary" : "textMuted"} />
      </Pressable>
    </View>
  );
}
