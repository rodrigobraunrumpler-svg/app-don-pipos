import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

// Después de 5 errores del PIN del celular, la sesión de este celular se cerró
export function LockedOut({ onSignInAgain }: { onSignInAgain: () => void }) {
  return (
    <View className="flex-1 bg-background px-5 pt-[30px]">
      <View className="h-[92px] w-[92px] items-center justify-center self-center rounded-full bg-caramel-soft">
        <Icon name="lock-outline" size={42} tone="accent" />
      </View>
      <Text className="mt-[18px] text-center font-extrabold text-[27px] leading-tight text-text">
        Cerramos la sesión
      </Text>
      <Text className="mt-1.5 text-center text-base text-text-secondary">
        Hubo 5 intentos con un PIN equivocado, así que la app se cerró en este celular. Tus pedidos y datos siguen
        guardados.
      </Text>
      <View className="mt-[22px]">
        <Button label="Ingresar de nuevo" onPress={onSignInAgain} />
      </View>
      <Text className="mt-3.5 text-center text-[13px] text-text-muted">
        Con tu número y tu PIN, como la primera vez.
      </Text>
    </View>
  );
}
