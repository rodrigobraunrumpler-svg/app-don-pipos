import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { PAYMENT_METHOD_LABELS } from "@/features/businesses";
import { formatWhen } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { incomeTitle } from "../rules/income";
import type { IncomeItem } from "../schema/income";

const ICONS: Record<IncomeItem["kind"], IconName> = {
  payment: "hand-coin-outline",
  refund: "cash-refund",
  manual: "cash-plus",
};
const MINUS = "−";

type Props = { item: IncomeItem; now: Date; onPress: () => void };

// Un ingreso en la lista: de dónde vino (el pedido o lo que se anotó), cuándo y con qué, y el monto. Una devolución
// resta: va con «−»
export function IncomeItemRow({ item, now, onPress }: Props) {
  const title = incomeTitle(item);
  const line = `${formatWhen(new Date(item.at), now)}, ${PAYMENT_METHOD_LABELS[item.method]}`;
  const amount = `${item.kind === "refund" ? MINUS : ""}${formatCents(item.amountCents)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${line}, ${amount}`}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-b border-border bg-surface px-4 py-3"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-olive-soft">
        <Icon name={ICONS[item.kind]} size={20} tone="olive" />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-bold text-base text-text">
          {title}
        </Text>
        <Text numberOfLines={1} className="text-[13px] text-text-secondary">
          {line}
        </Text>
      </View>
      <Text className="shrink-0 font-extrabold text-base text-text">{amount}</Text>
    </Pressable>
  );
}
