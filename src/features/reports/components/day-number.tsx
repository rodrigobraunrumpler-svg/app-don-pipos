import { Pressable, Text } from "react-native";

type Props = { value: string; text: string; label: string; onPress: () => void };

// Un número del día en «Cobrado hoy» («3 entregados ›»), que abre su lista
export function DayNumber({ value, text, label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-11 justify-center"
    >
      <Text className="font-extrabold text-lg text-on-primary">{value}</Text>
      <Text className="text-[12.5px] text-on-primary opacity-75">{`${text} ›`}</Text>
    </Pressable>
  );
}
