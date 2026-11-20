import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { weekdaySalesQuery } from "../queries/stock";
import { weekdayNote } from "../rules/suggestion";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

// «Cómo se vende» en Un alfajor (la maqueta): una barra por día de la semana con su promedio, y la nota que lo dice
// con palabras (el lector de pantalla lee la nota; las barras no). Sin 7 días de ventas no aparece
export function SalesByWeekday({ productId }: { productId: string }) {
  const { data } = useQuery(weekdaySalesQuery(productId));
  if (!data?.ready) return null;
  const max = Math.max(...data.days.map((day) => day.average), 1);
  return (
    <View className="mt-5">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        Cómo se vende
      </Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="mt-3">
        <View className="h-24 flex-row items-end gap-2">
          {LETTERS.map((letter, index) => {
            const average = data.days.find((day) => day.dow === index + 1)?.average ?? 0;
            return (
              <View
                key={index}
                className={`flex-1 rounded-t-sm ${index >= 5 ? "bg-caramel" : "bg-olive"}`}
                style={{ height: `${Math.max((average / max) * 100, 4)}%` }}
              />
            );
          })}
        </View>
        <View className="mt-1 flex-row gap-2">
          {LETTERS.map((letter, index) => (
            <Text key={index} className="flex-1 text-center text-xs text-text-secondary">
              {letter}
            </Text>
          ))}
        </View>
      </View>
      <View className="mt-3 flex-row gap-2">
        <Icon name="chart-bar" size={17} tone="textSecondary" />
        <Text className="flex-1 text-[13px] text-text-secondary">{weekdayNote(data.days)}</Text>
      </View>
    </View>
  );
}
