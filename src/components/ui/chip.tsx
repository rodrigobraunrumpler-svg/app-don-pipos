import { Pressable, Text } from "react-native";

// Una opción para elegir, como el motivo de una merma o el alfajor
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-full border-[1.5px] px-4 ${selected ? "border-primary bg-primary" : "border-border-strong bg-surface"}`}
    >
      <Text className={`font-bold text-sm ${selected ? "text-on-primary" : "text-text"}`}>{label}</Text>
    </Pressable>
  );
}
