import { View } from "react-native";

import { Chip } from "@/components/ui/chip";

import { ALLERGENS } from "../rules/web";

// Los alérgenos del alfajor (los 13 de la web). Los marca el dueño: salen en la web tal cual
export function AllergenChips({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {ALLERGENS.map(([key, label]) => (
        <Chip
          key={key}
          label={label}
          selected={value.includes(key)}
          onPress={() => onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key])}
        />
      ))}
    </View>
  );
}
