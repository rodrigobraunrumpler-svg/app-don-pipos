import { Pressable, ScrollView, Text } from "react-native";

import { PLACEHOLDERS, type TemplateKey } from "../rules/placeholders";

// Los marcadores que vale ese mensaje, para insertarlos donde está el cursor
export function PlaceholderChips({
  templateKey,
  onInsert,
}: {
  templateKey: TemplateKey;
  onInsert: (name: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-2"
    >
      {PLACEHOLDERS[templateKey].map((name) => (
        <Pressable
          key={name}
          accessibilityRole="button"
          accessibilityLabel={`Insertar {${name}}`}
          onPress={() => onInsert(name)}
          className="min-h-9 justify-center rounded-full border border-border-strong bg-surface px-3"
        >
          <Text className="font-bold text-[13px] text-text">{`{${name}}`}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
