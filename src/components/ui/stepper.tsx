import { Pressable, TextInput, View } from "react-native";

import { Icon } from "./icon";

type Props = { value: number; onChange: (value: number) => void; label: string; min?: number; max?: number };

const BUTTON = "h-[38px] w-[38px] items-center justify-center rounded-full";

// El contador − número + de la maqueta: una píldora de 44 de alto con botones de 38 y el número al medio (unos 116 de
// ancho, para que el nombre del alfajor quepa al lado en un celular angosto). En el límite, el botón se apaga.
// El número también se escribe: una producción de 145 no son 145 toques
export function Stepper({ value, onChange, label, min = 0, max = 10_000 }: Props) {
  const canLess = value > min;
  const canMore = value < max;
  return (
    <View className="h-11 flex-row items-center rounded-full border border-border-strong bg-surface px-[3px]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Menos ${label}`}
        accessibilityState={{ disabled: !canLess }}
        disabled={!canLess}
        onPress={() => onChange(value - 1)}
        className={`${BUTTON} ${canLess ? "" : "opacity-35"}`}
      >
        <Icon name="minus" size={20} />
      </Pressable>
      <TextInput
        accessibilityLabel={`Cantidad de ${label}`}
        value={String(value)}
        onChangeText={(text) => {
          if (!/^\d*$/.test(text)) return;
          onChange(Math.min(Math.max(text === "" ? min : Number(text), min), max));
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={String(max).length}
        className="min-w-7 px-0.5 py-0 text-center font-extrabold text-base text-text"
        style={{ fontVariant: ["tabular-nums"] }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Más ${label}`}
        accessibilityState={{ disabled: !canMore }}
        disabled={!canMore}
        onPress={() => onChange(value + 1)}
        className={`${BUTTON} ${canMore ? "" : "opacity-35"}`}
      >
        <Icon name="plus" size={20} />
      </Pressable>
    </View>
  );
}
