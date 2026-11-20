import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import { PAYMENT_METHOD_LABELS } from "@/features/businesses";
import { formatWhen } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { iconFor } from "../rules/category";
import { correctedText } from "../rules/expense";
import type { Expense } from "../schema/expense";

type Props = { expense: Expense; now: Date; onPress: () => void };

// Un gasto en la lista (la maqueta): su ícono, en qué (o su tipo), cuándo y con qué se pagó (o «Corregido, antes»), la
// cámara si tiene boleta, y el monto, que nunca se corta
export function ExpenseRow({ expense, now, onPress }: Props) {
  const title = expense.description ?? expense.categoryName;
  const line =
    expense.previousAmountCents !== null
      ? correctedText(expense.previousAmountCents)
      : `${formatWhen(new Date(expense.spentAt), now)}, ${PAYMENT_METHOD_LABELS[expense.method]}`;
  const amount = formatCents(expense.amountCents);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${line}, ${amount}${expense.receiptPath ? ", con foto de la boleta" : ""}`}
      onPress={onPress}
      className="min-h-16 flex-row items-center gap-3 border-b border-border bg-surface px-4 py-3"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-olive-soft">
        <Icon name={iconFor(expense.categoryIcon) as IconName} size={20} tone="olive" />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-bold text-base text-text">
          {title}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text numberOfLines={1} className="shrink text-[13px] text-text-secondary">
            {line}
          </Text>
          {expense.receiptPath ? <Icon name="camera-outline" size={14} tone="textSecondary" /> : null}
        </View>
      </View>
      <Text className="shrink-0 font-extrabold text-base text-text">{amount}</Text>
    </Pressable>
  );
}
