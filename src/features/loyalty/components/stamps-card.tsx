import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

import { cardLine } from "../rules/card";
import type { LoyaltyRule } from "../schema/loyalty";

// Hasta 30 sellos, una casilla por sello (la maqueta); con más (por alfajor), una barra
const MAX_CELLS = 30;

// La tarjeta de sellos de un cliente: cuántos lleva de la meta y lo que le falta para su premio
export function StampsCard({ rule, stamps }: { rule: LoyaltyRule; stamps: number }) {
  const shown = Math.min(stamps, rule.goal);
  return (
    <View className="rounded-md border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-extrabold text-base text-text">
          Tarjeta de sellos
        </Text>
        <Text className="font-bold text-sm text-text-secondary">{`${shown} de ${rule.goal}`}</Text>
      </View>
      {rule.goal <= MAX_CELLS ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {Array.from({ length: rule.goal }, (_, index) => (
            <View
              key={index}
              testID="stamp"
              className={`h-8 w-8 items-center justify-center rounded-full ${index < shown ? "bg-caramel-soft" : "border border-dashed border-border-strong"}`}
            >
              {index < shown ? (
                <View testID="stamp-filled">
                  <Icon name="cookie" size={18} tone="caramelText" />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${shown} de ${rule.goal} sellos`}
          className="mt-3 h-3 overflow-hidden rounded-full bg-sunken"
        >
          <View style={{ width: `${(shown / rule.goal) * 100}%` }} className="h-full rounded-full bg-caramel" />
        </View>
      )}
      <Text className="mt-3 text-sm text-text-secondary">{cardLine(rule, stamps)}</Text>
    </View>
  );
}
