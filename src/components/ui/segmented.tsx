import { Pressable, Text, View } from "react-native";

type Props<T extends string> = { label: string; options: [T, string][]; value: T; onChange: (value: T) => void };

// Una sola opción entre pocas, una al lado de la otra (la entrega, cuánto paga ahora)
export function Segmented<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-2">
      {options.map(([key, text]) => {
        const checked = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={text}
            accessibilityState={{ checked }}
            onPress={() => onChange(key)}
            className={`min-h-11 flex-1 items-center justify-center rounded-sm border-[1.5px] px-2 ${checked ? "border-primary bg-primary" : "border-border-strong bg-surface"}`}
          >
            <Text className={`font-bold text-sm ${checked ? "text-on-primary" : "text-text"}`}>{text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
