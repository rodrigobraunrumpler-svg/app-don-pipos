import { Linking } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { appEnv } from "@/lib/env";

const MESSAGE = "Hola, necesito un PIN nuevo para la app de Don Pipos.";

// Abre WhatsApp con el equipo. Sin su número (EXPO_PUBLIC_SUPPORT_WHATSAPP), el botón no se muestra
export function SupportLink({ label, variant = "text" }: { label: string; variant?: "text" | "secondary" }) {
  const number = appEnv.ok ? appEnv.env.supportWhatsapp : undefined;
  if (!number) return null;
  return (
    <Button
      label={label}
      variant={variant}
      icon={variant === "secondary" ? <Icon name="whatsapp" size={19} /> : undefined}
      onPress={() => void Linking.openURL(`https://wa.me/${number}?text=${encodeURIComponent(MESSAGE)}`)}
    />
  );
}
