import { Pressable, Text, View } from "react-native";

import { MessageButton } from "@/features/messages";
import { formatCents } from "@/lib/money";

import { orderNumber } from "../rules/number";
import { receivableReason } from "../rules/receivable";
import type { Receivable } from "../schema/order";

type Props = { item: Receivable; now: Date; onPress: () => void };

// Una fila de Por cobrar (la maqueta): número, cliente y por qué debe, que abren el pedido; a la derecha lo que falta y
// «Recordar» por WhatsApp si ya entregó o recibió un adelanto (y hay teléfono)
export function ReceivableRow({ item, now, onPress }: Props) {
  const number = orderNumber(item.number);
  const due = formatCents(item.totalCents - item.paidCents);
  const customer = item.customerName ?? "Cliente de mostrador";
  const firstName = customer.replace(/ .*/, "");
  const reason = receivableReason(item, now);
  return (
    <View className="flex-row items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${number}, ${customer}, ${reason}`}
        onPress={onPress}
        className="flex-1 gap-0.5"
      >
        <Text className="font-extrabold text-[13px] text-text-secondary">{number}</Text>
        <Text numberOfLines={1} className="font-bold text-base text-text">
          {customer}
        </Text>
        <Text numberOfLines={2} className="text-[13px] text-text-secondary">
          {reason}
        </Text>
      </Pressable>
      {/* Hasta poco más de la mitad: un nombre largo en «Recordar a …» se corta y no aplasta al cliente */}
      <View className="max-w-[55%] shrink-0 items-end gap-1.5">
        <Text className="font-extrabold text-base text-text">{due}</Text>
        {!item.remind ? (
          <Text className="text-xs text-text-muted">Sin recordatorio todavía</Text>
        ) : item.customerPhone ? (
          <MessageButton
            templateKey="balance_reminder"
            context={{ nombre: firstName, numero: number, falta: due }}
            phone={item.customerPhone}
            label={`Recordar a ${firstName}`}
          />
        ) : (
          <Text className="text-xs text-text-muted">Sin teléfono</Text>
        )}
      </View>
    </View>
  );
}
