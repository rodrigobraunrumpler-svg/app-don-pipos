import { Switch, Text, View } from "react-native";

import { useTheme } from "@/theme";

type Props = {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
};

// Una fila con su interruptor (Medios de pago, Recordatorios): el nombre y su explicación a la izquierda; el nombre se
// corta con «…», nunca el interruptor
export function SwitchRow({ label, description, value, disabled = false, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View className="min-h-[56px] flex-row items-center gap-3 border-b border-border py-2">
      <View className="flex-1">
        <Text numberOfLines={1} className="font-bold text-base text-text">
          {label}
        </Text>
        {description ? <Text className="text-[13px] text-text-secondary">{description}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        // El lector de pantalla dice «deshabilitado» también donde Switch no lo pasa solo
        accessibilityState={{ disabled }}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
      />
    </View>
  );
}
