import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ProductAvatar } from "@/features/products";
import { productionSuggestionQuery, suggestedTotal, suggestionTitle, upToDateText } from "@/features/stock";
import { useOnline } from "@/lib/use-online";

// Qué producir (la sugerencia de la maqueta): cuánto conviene hacer, de cuáles y «Registrar producción», o que la
// producción está al día. Sin 7 días de ventas no dice nada; si no carga, tampoco (Stock la muestra)
export function HomeSuggestion({ onProduction }: { onProduction: () => void }) {
  const online = useOnline();
  const { data } = useQuery(productionSuggestionQuery);
  if (!data?.ready) return null;
  const total = suggestedTotal(data.items);
  if (!total)
    return (
      <View className="mt-6 flex-row items-center gap-2.5">
        <Icon name="check-circle-outline" size={20} tone="olive" />
        <Text className="flex-1 font-bold text-sm text-text">{upToDateText(data.horizonDays)}</Text>
      </View>
    );
  return (
    <View className="mt-6 rounded-md bg-caramel-soft p-4">
      <View className="flex-row gap-3">
        <Icon name="cookie-outline" size={26} tone="caramelText" />
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-extrabold text-[17px] leading-[21px] text-text">
            {suggestionTitle(total, data.horizonDays)}
          </Text>
          <Text className="mt-0.5 text-[13.5px] text-text-secondary">
            Según lo que vendes cada día y lo que tienes.
          </Text>
        </View>
      </View>
      <View className="my-3.5 flex-row flex-wrap gap-1.5">
        {data.items
          .filter((item) => item.suggested > 0)
          .map((item) => (
            <View
              key={item.productId}
              className="flex-row items-center gap-1.5 rounded-full bg-surface py-1 pl-1 pr-2.5"
            >
              <ProductAvatar product={item} size="mini" />
              <Text className="font-semibold text-[13px] text-text">{item.name}</Text>
              <Text className="font-extrabold text-[13px] text-text">{item.suggested}</Text>
            </View>
          ))}
      </View>
      <Button label="Registrar producción" disabled={!online} onPress={onProduction} />
    </View>
  );
}
