import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { formatCents } from "@/lib/money";

import { iconFor } from "../rules/category";
import { barShare } from "../rules/expense";
import type { ExpensesSummary } from "../schema/expense";

// Lo gastado por tipo, de mayor a menor, cada barra frente al tipo que más gastó (la maqueta)
export function CategoryBars({ summary }: { summary: ExpensesSummary }) {
  const max = summary.byCategory[0]?.totalCents ?? 0;
  return (
    <View className="mt-3 gap-2.5">
      {summary.byCategory.map((item) => (
        <View key={item.categoryId} className="flex-row items-center gap-2.5">
          <View className="w-[38%] flex-row items-center gap-1.5">
            <Icon name={iconFor(item.icon) as IconName} size={16} tone="olive" />
            <Text numberOfLines={1} className="flex-1 text-[13px] text-text">
              {item.name}
            </Text>
          </View>
          <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken">
            <View className="h-full rounded-full bg-olive" style={{ width: `${barShare(item.totalCents, max)}%` }} />
          </View>
          <Text className="shrink-0 text-right font-bold text-[13px] text-text">{formatCents(item.totalCents)}</Text>
        </View>
      ))}
    </View>
  );
}
