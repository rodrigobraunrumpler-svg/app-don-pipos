import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

// Una parte de Inicio o de Reportes que no cargó: las demás se siguen viendo
export function PartError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <View className="mt-4 flex-row items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
      <Icon name="alert-circle-outline" size={22} tone="danger" />
      <Text className="flex-1 font-bold text-sm text-text">{`No se pudo cargar ${what}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reintentar"
        onPress={onRetry}
        className="min-h-11 justify-center"
      >
        <Text className="font-extrabold text-sm text-accent">Reintentar</Text>
      </Pressable>
    </View>
  );
}
