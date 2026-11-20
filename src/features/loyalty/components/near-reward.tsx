import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";

import { loyaltyOverviewQuery } from "../queries/loyalty";
import { nearRewardText } from "../rules/card";
import type { LoyaltyRule } from "../schema/loyalty";

// «Cerca del premio»: los que tienen la meta − 2 sellos o más, con lo que les falta
export function NearReward({ rule }: { rule: LoyaltyRule }) {
  const customers = useQuery(loyaltyOverviewQuery).data?.customers;
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
        Cerca del premio
      </Text>
      <View className="overflow-hidden rounded-md border border-border bg-surface">
        {customers?.length ? (
          customers.map((customer) => (
            <View
              key={customer.customerId}
              className="min-h-14 flex-row items-center gap-3 border-b border-border px-4 py-2"
            >
              <Avatar name={customer.name} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-extrabold text-sm text-text">
                  {customer.name}
                </Text>
                <Text className="text-[13px] text-text-secondary">{nearRewardText(rule, customer.stamps)}</Text>
              </View>
              <Text className="shrink-0 font-extrabold text-sm text-text">
                {`${Math.min(customer.stamps, rule.goal)}/${rule.goal}`}
              </Text>
            </View>
          ))
        ) : (
          <View className="px-4 py-3">
            <Text className="font-bold text-sm text-text">Nadie todavía</Text>
            <Text className="text-[13px] text-text-secondary">Aparecen aquí cuando les faltan 2 o menos.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
