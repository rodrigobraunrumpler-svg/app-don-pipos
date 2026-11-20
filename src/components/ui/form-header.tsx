import { Pressable, Text, View } from "react-native";

import { Icon } from "./icon";

// La cabecera de un formulario o un detalle: volver, el título y una línea debajo
export function FormHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-2 px-3 pb-2 pt-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={8} className="p-2">
        <Icon name="arrow-left" size={24} />
      </Pressable>
      <View className="flex-1">
        <Text accessibilityRole="header" className="font-extrabold text-2xl text-text">
          {title}
        </Text>
        {subtitle ? <Text className="text-sm text-text-secondary">{subtitle}</Text> : null}
      </View>
    </View>
  );
}
