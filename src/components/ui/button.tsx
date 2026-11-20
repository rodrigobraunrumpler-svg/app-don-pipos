import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

type Variant = "primary" | "secondary" | "text" | "danger" | "dangerText";

const BOX: Record<Variant, string> = {
  primary: "min-h-[50px] bg-primary",
  secondary: "min-h-[50px] border-[1.5px] border-border-strong bg-surface",
  text: "min-h-11",
  // Anular: letra roja sobre rojo suave (el par que revisa la prueba de contraste), y su versión de texto
  danger: "min-h-[50px] bg-danger-soft",
  dangerText: "min-h-11",
};
const LABEL: Record<Variant, string> = {
  primary: "text-on-primary",
  secondary: "text-text",
  text: "text-accent",
  danger: "text-danger",
  dangerText: "text-danger",
};

type Props = { label: string; onPress: () => void; variant?: Variant; icon?: ReactNode; disabled?: boolean };

// Los botones de la maqueta: el principal (bosque), el secundario (con borde), el de texto y los de anular
export function Button({ label, onPress, variant = "primary", icon, disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`w-full flex-row items-center justify-center gap-2 rounded-full px-4 ${disabled && variant !== "text" && variant !== "dangerText" ? "min-h-[50px] bg-border-strong" : BOX[variant]}`}
    >
      {icon}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        className={`shrink font-extrabold text-base ${disabled ? "text-text-muted" : LABEL[variant]}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
