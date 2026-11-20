import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { businessDate, formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { dueDayLabel } from "../rules/day";
import type { Order } from "../schema/order";

type Props = { order: Order; now: Date; canPay: boolean; disabled: boolean; onPay: () => void };

// «Hoy, 14:30», «Ayer, 09:10», «Lunes 16, 18:00»
function paidWhen(paidAt: string, now: Date): string {
  const at = new Date(paidAt);
  const day = dueDayLabel(businessDate(at), now);
  return `${day ? day.charAt(0).toUpperCase() + day.slice(1) : "Hoy"}, ${formatTime(at)}`;
}

// Los pagos del pedido, uno por uno, y lo que falta cobrar
export function OrderPayments({ order, now, canPay, disabled, onPay }: Props) {
  const due = order.totalCents - order.paidCents;
  const payments = order.payments.filter((payment) => !payment.voidedAt);
  return (
    <View className="mt-5">
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
          Pagos
        </Text>
        {canPay ? (
          <View>
            <Button variant="text" label="Registrar pago" disabled={disabled} onPress={onPay} />
          </View>
        ) : null}
      </View>
      <View className="mt-2 overflow-hidden rounded-md border border-border bg-surface">
        {payments.length ? (
          payments.map((payment) => (
            <View key={payment.id} className="flex-row items-center gap-3 border-b border-border px-4 py-3">
              <Icon name="hand-coin-outline" size={20} tone="accent" />
              <View className="flex-1">
                <Text className="font-bold text-base text-text">{PAYMENT_METHOD_LABELS[payment.method]}</Text>
                <Text className="text-[13px] text-text-secondary">{paidWhen(payment.paidAt, now)}</Text>
              </View>
              <Text className="font-extrabold text-base text-text">
                {`${payment.kind === "refund" ? "−" : ""}${formatCents(payment.amountCents)}`}
              </Text>
            </View>
          ))
        ) : (
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Icon name="timer-sand" size={20} tone="textMuted" />
            <View>
              <Text className="font-bold text-base text-text">Sin pagos todavía</Text>
              <Text className="text-[13px] text-text-secondary">
                {order.fulfillment === "pickup" ? "Se cobra al recoger" : "Se cobra al entregar"}
              </Text>
            </View>
          </View>
        )}
      </View>
      <Text className={`mt-2 font-bold text-sm ${due > 0 ? "text-text-secondary" : "text-accent"}`}>
        {due > 0 ? `Falta cobrar ${formatCents(due)}` : "Pagado completo"}
      </Text>
    </View>
  );
}
