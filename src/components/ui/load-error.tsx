import { Text, View } from "react-native";

import { Button } from "./button";
import { Icon } from "./icon";

// Cuando una pantalla no pudo traer sus datos (la maqueta, «pantallaError»)
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <View className="items-center px-5 pt-10">
      <Icon name="alert-circle-outline" size={42} tone="danger" />
      <Text className="mt-4 text-center font-extrabold text-xl text-text">{`No se pudo cargar ${what}`}</Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">
        Revisa tu conexión y vuelve a intentar. Si sigue igual, escribe a soporte.
      </Text>
      <View className="mt-5 w-full">
        <Button label="Reintentar" onPress={onRetry} icon={<Icon name="refresh" size={18} tone="onPrimary" />} />
      </View>
    </View>
  );
}
