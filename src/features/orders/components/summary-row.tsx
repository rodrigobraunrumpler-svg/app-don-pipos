import { Text, View } from "react-native";

// Una fila del resumen o del detalle: qué y cuánto. El total va más fuerte
export function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const text = strong ? "font-extrabold text-lg text-text" : "text-base text-text";
  return (
    <View className="flex-row items-center gap-3 py-1">
      <Text numberOfLines={1} className={`flex-1 ${text}`}>
        {label}
      </Text>
      <Text className={`shrink-0 ${text}`}>{value}</Text>
    </View>
  );
}
