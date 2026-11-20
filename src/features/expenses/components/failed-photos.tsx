import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { useFailedPhotos } from "../hooks/use-expense-changes";

// En Gastos: las fotos de boletas que no se subieron (con mala señal, o después de salir del formulario), con
// «Reintentar las fotos». Así ninguna se pierde sin aviso
export function FailedPhotos() {
  const { count, retryAll } = useFailedPhotos();
  if (count === 0) return null;
  return (
    <View accessibilityRole="alert" className="mt-3 gap-1 rounded-md bg-warning-soft px-4 py-3">
      <View className="flex-row gap-2">
        <Icon name="camera-off-outline" size={18} tone="warning" />
        <Text className="flex-1 font-bold text-sm text-text">
          {`La foto de ${count} ${count === 1 ? "gasto" : "gastos"} no se subió.`}
        </Text>
      </View>
      <View className="self-start">
        <Button variant="text" label="Reintentar las fotos" onPress={retryAll} />
      </View>
    </View>
  );
}
