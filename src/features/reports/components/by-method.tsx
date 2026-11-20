import { Text, View } from "react-native";

import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/features/businesses";
import { formatCents } from "@/lib/money";

import { METHOD_COLORS } from "../constants";
import type { ReportSummary } from "../schema/report";

// Lo cobrado en el periodo por medio de pago, con una barra para comparar
export function ByMethod({ byMethod }: { byMethod: ReportSummary["byMethod"] }) {
  const max = Math.max(1, ...PAYMENT_METHODS.map((method) => byMethod[method]));
  return (
    <View className="mt-6">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        Por medio de pago
      </Text>
      <View className="mt-2 gap-3 rounded-md border border-border bg-surface p-4">
        {PAYMENT_METHODS.map((method) => (
          <View key={method} className="flex-row items-center gap-2.5">
            <View className="w-28 flex-row items-center gap-2">
              <View className={`h-2.5 w-2.5 rounded-full ${METHOD_COLORS[method]}`} />
              <Text numberOfLines={1} className="shrink font-bold text-[13.5px] text-text">
                {PAYMENT_METHOD_LABELS[method]}
              </Text>
            </View>
            <View className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
              <View
                style={{ width: `${(Math.max(0, byMethod[method]) / max) * 100}%` }}
                className="h-full rounded-full bg-primary"
              />
            </View>
            <Text className="font-extrabold text-[13.5px] text-text">{formatCents(byMethod[method])}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
