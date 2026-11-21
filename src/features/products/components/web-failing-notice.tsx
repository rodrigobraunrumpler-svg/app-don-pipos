import { Linking, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { appEnv } from "@/lib/env";
import { waLink } from "@/lib/whatsapp";

const MESSAGE = "Hola, los cambios de los alfajores no están llegando a la web de Don Pipos.";

// Arriba de Productos y precios, si algún alfajor no se pudo subir a la web (3 intentos): lo guardado en la app está a
// salvo, y «Avisar al equipo» abre WhatsApp con el equipo (sin su número, el botón no sale)
export function WebFailingNotice() {
  const number = appEnv.ok ? appEnv.env.supportWhatsapp : undefined;
  return (
    <View accessibilityRole="alert" className="mt-3 gap-1 rounded-md bg-warning-soft px-4 py-3">
      <View className="flex-row gap-2">
        <Icon name="alert-circle-outline" size={18} tone="warning" />
        <Text className="flex-1 font-bold text-sm text-text">
          La web no se está actualizando. Tus cambios están guardados en la app.
        </Text>
      </View>
      {number ? (
        <View className="self-start">
          <Button
            variant="text"
            label="Avisar al equipo"
            icon={<Icon name="whatsapp" size={18} />}
            onPress={() => void Linking.openURL(waLink(number, MESSAGE))}
          />
        </View>
      ) : null}
    </View>
  );
}
