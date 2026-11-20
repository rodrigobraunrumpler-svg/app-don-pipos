import { Text, View } from "react-native";

import { formatCents } from "@/lib/money";

import { lastOrderLabel } from "../rules/last-order";
import type { Customer } from "../schema/customer";

// Pedidos, gastado y último (la maqueta); de un cliente borrado, «—» en vez de su contacto
export function CustomerStats({ customer, now }: { customer: Customer; now: Date }) {
  const last = customer.anonymizedAt
    ? { value: "—", label: "contacto" }
    : {
        value: customer.lastOrderAt ? lastOrderLabel(new Date(customer.lastOrderAt), now).split(",")[0]! : "—",
        label: "último",
      };
  const stats = [
    { value: String(customer.ordersCount), label: customer.ordersCount === 1 ? "pedido" : "pedidos" },
    { value: formatCents(customer.spentCents).replace(/\.00$/, ""), label: "gastado" },
    last,
  ];
  return (
    <View className="flex-row rounded-md border border-border bg-surface py-3">
      {stats.map((stat, index) => (
        <View key={stat.label} className={`flex-1 items-center ${index > 0 ? "border-l border-border" : ""}`}>
          <Text numberOfLines={1} adjustsFontSizeToFit className="font-extrabold text-lg text-text">
            {stat.value}
          </Text>
          <Text className="text-xs text-text-secondary">{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}
