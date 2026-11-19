import { View } from "react-native";

type Props = { filled: number; error?: boolean; length?: number; align?: "center" | "start" };

// Los puntos del PIN: llenos los que ya se escribieron; en rojo si el PIN no fue el correcto
export function PinDots({ filled, error = false, length = 6, align = "center" }: Props) {
  const dots = Array.from({ length }, (_, position) => position);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${filled} de ${length} números`}
      className={`flex-row gap-4 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      {dots.map((position) => (
        <View
          key={`punto-${position}`}
          className={`h-[15px] w-[15px] rounded-full border-2 ${error ? "border-danger" : "border-accent"} ${position < filled ? (error ? "bg-danger" : "bg-accent") : ""}`}
        />
      ))}
    </View>
  );
}
