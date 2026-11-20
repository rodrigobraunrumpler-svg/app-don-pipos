import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { PAYMENT_METHOD_LABELS } from "@/features/businesses";
import { formatCents } from "@/lib/money";

import type { CashExpected } from "../schema/cash";

const OTHERS = ["yape", "plin", "transfer"] as const;

// Yape, Plin y transferencias del día, aparte del efectivo, para compararlos con sus apps. Solo los que tienen monto
export function OtherMethods({ others }: { others: CashExpected["otherMethods"] }) {
  const shown = OTHERS.filter((method) => others[method] !== 0);
  if (shown.length === 0) return null;
  return (
    <View className="mt-5 gap-2 rounded-md border border-border bg-surface px-4 py-4">
      <Text accessibilityRole="header" className="font-extrabold text-base text-text">
        Yape, Plin y transferencias
      </Text>
      {shown.map((method) => (
        <View key={method} className="flex-row items-center justify-between">
          <Text className="text-sm text-text-secondary">{PAYMENT_METHOD_LABELS[method]}</Text>
          <Text className="font-bold text-sm text-text">{formatCents(others[method])}</Text>
        </View>
      ))}
      <View className="mt-1 flex-row gap-2">
        <Icon name="cellphone" size={16} tone="textSecondary" />
        <Text className="flex-1 text-[13px] text-text-secondary">Compáralos con lo que muestran sus apps.</Text>
      </View>
    </View>
  );
}
