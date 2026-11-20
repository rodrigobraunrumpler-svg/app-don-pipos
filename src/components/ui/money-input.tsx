import { Text, TextInput, View } from "react-native";

import { useTheme } from "@/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  // El monto grande de Anotar gasto (la maqueta)
  large?: boolean;
};

// Un monto en soles: «S/» y el número, con el teclado numérico
export function MoneyInput({ label, value, onChangeText, placeholder, large = false }: Props) {
  const { colors } = useTheme();
  return (
    <View
      className={`flex-row items-center gap-2.5 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5 ${large ? "min-h-[72px]" : "min-h-[50px]"}`}
    >
      <Text className={`font-extrabold text-text-secondary ${large ? "text-2xl" : "text-base"}`}>S/</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className={`flex-1 font-bold text-text ${large ? "text-4xl" : "text-base"}`}
      />
    </View>
  );
}
