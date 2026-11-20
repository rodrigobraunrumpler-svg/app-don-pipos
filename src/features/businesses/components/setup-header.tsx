import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";

// La cabecera de cada paso (la maqueta): el logo en el primero y «Paso anterior» en los demás, y una barra de tres partes
export function SetupHeader({ step, onBack }: { step: 1 | 2 | 3; onBack?: () => void }) {
  return (
    <View className="px-5 pt-2">
      <View className="min-h-11 flex-row items-center gap-3">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Paso anterior"
            onPress={onBack}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="arrow-left" size={24} />
          </Pressable>
        ) : (
          <Logo size="tiny" />
        )}
        <Text className="font-bold text-sm text-text-secondary">{`Paso ${step} de 3`}</Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-2 flex-row gap-1.5"
      >
        {[1, 2, 3].map((part) => (
          <View key={part} className={`h-1.5 flex-1 rounded-full ${part <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </View>
    </View>
  );
}
