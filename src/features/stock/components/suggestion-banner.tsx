import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { productionSuggestionQuery } from "../queries/stock";
import { suggestedTotal, suggestionTitle, upToDateText } from "../rules/suggestion";

// Arriba de Stock (la maqueta): cuánto conviene hacer para los días de producción, que lleva a Registrar producción
// con lo sugerido de cada alfajor, o que la producción está al día. Sin 7 días de ventas no dice nada
export function SuggestionBanner({ onOpen }: { onOpen: () => void }) {
  const { data } = useQuery(productionSuggestionQuery);
  if (!data?.ready) return null;
  const total = suggestedTotal(data.items);
  if (!total)
    return (
      <View className="mt-3 flex-row items-center gap-2">
        <Icon name="check-circle-outline" size={18} tone="olive" />
        <Text className="flex-1 text-sm text-text">{upToDateText(data.horizonDays)}</Text>
      </View>
    );
  const title = suggestionTitle(total, data.horizonDays);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. Ver cuánto de cada uno`}
      onPress={onOpen}
      className="mt-3 flex-row items-center gap-3 rounded-md bg-caramel-soft px-4 py-3"
    >
      <Icon name="cookie-outline" size={24} tone="caramelText" />
      <View className="flex-1">
        <Text className="font-extrabold text-base text-text">{title}</Text>
        <Text className="text-[13px] text-text-secondary">Ver cuánto de cada uno</Text>
      </View>
      <Icon name="chevron-right" size={22} tone="textSecondary" />
    </Pressable>
  );
}
