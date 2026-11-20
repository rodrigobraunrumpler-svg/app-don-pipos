import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { formatCents } from "@/lib/money";

import { customerLine } from "../rules/last-order";
import type { CustomerRow as Row } from "../schema/customer";

type Props = { customer: Row; now: Date; position?: number; lapsed?: boolean; action?: ReactNode; onPress: () => void };

// Un cliente en la lista (cli-fila de la maqueta): sus iniciales, el nombre (con su puesto en «Los que más compran»),
// sus pedidos y el último, y lo gastado, que nunca se corta. En «No vuelven», debajo, «Escribirle» o por qué no
export function CustomerRow({ customer, now, position, lapsed = false, action, onPress }: Props) {
  const name = position ? `${position}. ${customer.name}` : customer.name;
  const line = customerLine(customer, now);
  const spent = formatCents(customer.spentCents);
  return (
    <View className="border-b border-border bg-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${customer.name}, ${line}, ${spent}`}
        onPress={onPress}
        className="min-h-[64px] flex-row items-center gap-3 px-4 py-2.5"
      >
        <Avatar name={customer.name} muted={lapsed} />
        <View className="flex-1">
          <Text numberOfLines={1} className="font-extrabold text-base text-text">
            {name}
          </Text>
          <Text numberOfLines={1} className="text-[13px] text-text-secondary">
            {line}
          </Text>
        </View>
        <Text className="shrink-0 font-extrabold text-sm text-text">{spent}</Text>
      </Pressable>
      {lapsed ? (
        <View className="flex-row px-4 pb-3 pl-[72px]">
          {customer.acceptsPromotions ? (
            action
          ) : (
            <Text className="text-[13px] text-text-muted">Sin permiso para promociones</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
