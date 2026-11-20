import { Text, View } from "react-native";

// Las iniciales de un nombre: las de sus dos primeras palabras («Lucía R.» → «LR»); sin nombre, «?»
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

// Un círculo con las iniciales; apagado para quien ya no compra. El nombre va siempre al lado: el lector de pantalla
// no lo lee
export function Avatar({ name, muted = false }: { name: string; muted?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`h-11 w-11 items-center justify-center rounded-full ${muted ? "bg-sunken" : "bg-caramel-soft"}`}
    >
      <Text className={`font-extrabold text-sm ${muted ? "text-text-muted" : "text-caramel-text"}`}>
        {initials(name)}
      </Text>
    </View>
  );
}
