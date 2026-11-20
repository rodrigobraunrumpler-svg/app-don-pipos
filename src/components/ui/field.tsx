import { TextInput, View, type KeyboardTypeOptions } from "react-native";

import { useTheme } from "@/theme";

import { Icon, type IconName } from "./icon";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: IconName;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
};

// Un campo de texto de una línea, con su ícono (la dirección, la hora)
export function Field({ label, value, onChangeText, icon, placeholder, maxLength, keyboardType }: Props) {
  const { colors } = useTheme();
  return (
    <View className="min-h-[50px] flex-row items-center gap-2.5 rounded-sm border-[1.5px] border-border-strong bg-surface px-3.5">
      {icon ? <Icon name={icon} size={20} tone="textSecondary" /> : null}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className="flex-1 font-bold text-base text-text"
      />
    </View>
  );
}
