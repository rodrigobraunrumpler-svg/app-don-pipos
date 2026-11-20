import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Stepper } from "@/components/ui/stepper";
import { ProductAvatar } from "@/features/products";

import { whyText } from "../rules/suggestion";
import type { StockItem, SuggestionItem } from "../schema/stock";

type Props = {
  item: StockItem;
  suggestion: SuggestionItem | undefined;
  horizonDays: number;
  value: number;
  onChange: (value: number) => void;
};

// Un alfajor en Registrar producción: con historia, «Sugerido: 36» y «Por qué 36», que se despliega con la cuenta;
// sin historia, «Anota cuántos hiciste». El contador al lado
export function SuggestedRow({ item, suggestion, horizonDays, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View className="border-b border-border">
      <View className="min-h-[68px] flex-row items-center gap-3 px-3.5 py-3">
        <ProductAvatar product={item} />
        <View className="flex-1">
          <Text numberOfLines={2} className="font-extrabold text-base text-text">
            {item.name}
          </Text>
          {suggestion ? (
            <>
              <Text className="text-[13px] text-text-secondary">{`Sugerido: ${suggestion.suggested}`}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Por qué ${suggestion.suggested}`}
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen((current) => !current)}
                hitSlop={8}
                className="flex-row items-center gap-0.5 self-start"
              >
                <Text className="font-bold text-[13px] text-accent">{`Por qué ${suggestion.suggested}`}</Text>
                <Icon name={open ? "chevron-up" : "chevron-down"} size={16} tone="accent" />
              </Pressable>
            </>
          ) : (
            <Text numberOfLines={2} className="text-[13px] text-text-secondary">
              Anota cuántos hiciste
            </Text>
          )}
        </View>
        <Stepper value={value} onChange={onChange} label={item.name} />
      </View>
      {suggestion && open ? (
        <Text className="bg-sunken px-3.5 py-2.5 text-sm text-text">{whyText(suggestion, horizonDays)}</Text>
      ) : null}
    </View>
  );
}
