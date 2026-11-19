import { Text, TextInput, View } from "react-native";

import { useTheme } from "@/theme";

type Props = { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string };

// Un monto en soles: «S/» y el número, con el teclado numérico
export function MoneyInput({ label, value, onChangeText, placeholder }: Props) {
  const { colors } = useTheme();
  return (
    <View className="min-h-[50px] flex-row items-center gap-2.5 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5">
      <Text className="font-extrabold text-base text-text-secondary">S/</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className="flex-1 font-bold text-base text-text"
      />
    </View>
  );
}
