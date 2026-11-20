import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { barLabel, barText, type BarUnit } from "../rules/bars";
import type { Bar } from "../schema/report";

const HEIGHT = 120;

type Props = { bars: Bar[]; unit: BarUnit; today: string };

// «Entra y sale»: un par de barras por día, semana o mes (ingresos en verde, gastos en caramelo). La tocada dice
// cuánto entró y salió; al abrir, la última
export function InOutChart({ bars, unit, today }: Props) {
  const [chosen, setChosen] = useState(bars.length - 1);
  const selected = Math.min(chosen, bars.length - 1);
  const max = Math.max(1, ...bars.flatMap((bar) => [bar.incomeCents, bar.expensesCents]));
  const height = (cents: number) => (Math.max(0, cents) / max) * HEIGHT;
  const current = bars[selected];
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
          Entra y sale
        </Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 rounded-[3px] bg-primary" />
          <Text className="font-bold text-xs text-text-secondary">Ingresos</Text>
          <View className="ml-1.5 h-2.5 w-2.5 rounded-[3px] bg-caramel" />
          <Text className="font-bold text-xs text-text-secondary">Gastos</Text>
        </View>
      </View>
      {current ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 text-sm text-text">
          {barText(current, unit, today)}
        </Text>
      ) : null}
      <View className="mt-2 flex-row gap-1.5 rounded-md border border-border bg-surface px-2.5 pb-2 pt-4">
        {bars.map((bar, index) => (
          <Pressable
            key={bar.from}
            accessibilityRole="button"
            accessibilityLabel={barText(bar, unit, today)}
            accessibilityState={{ selected: index === selected }}
            onPress={() => setChosen(index)}
            className={`flex-1 items-center gap-1.5 rounded-sm px-0.5 py-1 ${index === selected ? "bg-sunken" : ""}`}
          >
            <View style={{ height: HEIGHT }} className="w-full flex-row items-end justify-center gap-1">
              <View
                style={{ height: height(bar.incomeCents) }}
                className="max-w-[26px] flex-1 rounded-t-[5px] bg-primary"
              />
              <View
                style={{ height: height(bar.expensesCents) }}
                className="max-w-[26px] flex-1 rounded-t-[5px] bg-caramel"
              />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-xs text-text-muted">
              {barLabel(bar, unit, today)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
