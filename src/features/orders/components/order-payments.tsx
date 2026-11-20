import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { businessDate, formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { dueDayLabel } from "../rules/day";
import type { Order, Payment, PaymentMethod } from "../schema/order";
import { ChangeMethodSheet } from "./change-method-sheet";

type Props = {
  order: Order;
  now: Date;
  canPay: boolean;
  disabled: boolean;
  methods: PaymentMethod[];
  onPay: () => void;
  onMessage: (text: string) => void;
};

// «Hoy, 14:30», «Ayer, 09:10», «Lunes 16, 18:00»
function paidWhen(paidAt: string, now: Date): string {
  const at = new Date(paidAt);
  const day = dueDayLabel(businessDate(at), now);
  return `${day ? day.charAt(0).toUpperCase() + day.slice(1) : "Hoy"}, ${formatTime(at)}`;
}

// Los pagos del pedido, uno por uno (las devoluciones en negativo), cada uno con «Cambiar medio» si hay otro medio
// activo, y lo que falta cobrar
export function OrderPayments({ order, now, canPay, disabled, methods, onPay, onMessage }: Props) {
  const [changing, setChanging] = useState<Payment | null>(null);
  const due = order.totalCents - order.paidCents;
  const cancelled = order.status === "cancelled";
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
              <Icon name={payment.kind === "refund" ? "cash-refund" : "hand-coin-outline"} size={20} tone="accent" />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-bold text-base text-text">
                  {`${payment.kind === "refund" ? "Devolución: " : ""}${PAYMENT_METHOD_LABELS[payment.method]}`}
                </Text>
                <Text className="text-[13px] text-text-secondary">{paidWhen(payment.paidAt, now)}</Text>
              </View>
              <View className="shrink-0 items-end">
                <Text className="font-extrabold text-base text-text">
                  {`${payment.kind === "refund" ? "−" : ""}${formatCents(payment.amountCents)}`}
                </Text>
                {methods.some((method) => method !== payment.method) ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar medio"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    hitSlop={10}
                    onPress={() => setChanging(payment)}
                  >
                    <Text className={`font-bold text-[13px] ${disabled ? "text-text-muted" : "text-accent"}`}>
                      Cambiar medio
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <View className="flex-row items-center gap-3 px-4 py-3">
            <Icon name="timer-sand" size={20} tone="textMuted" />
            <View>
              <Text className="font-bold text-base text-text">{cancelled ? "Sin pagos" : "Sin pagos todavía"}</Text>
              {cancelled ? null : (
                <Text className="text-[13px] text-text-secondary">
                  {order.fulfillment === "pickup" ? "Se cobra al recoger" : "Se cobra al entregar"}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
      {/* Anulado no se cobra: dice con cuánto se quedó el negocio, si no lo devolvió todo */}
      <Text className={`mt-2 font-bold text-sm ${due > 0 || cancelled ? "text-text-secondary" : "text-accent"}`}>
        {cancelled
          ? `Anulado: no se cobra${order.paidCents > 0 ? `. Te quedaste con ${formatCents(order.paidCents)}` : ""}.`
          : due > 0
            ? `Falta cobrar ${formatCents(due)}`
            : "Pagado completo"}
      </Text>
      {changing ? (
        <ChangeMethodSheet
          order={order}
          payment={changing}
          methods={methods}
          onClose={() => setChanging(null)}
          onDone={(method) => {
            setChanging(null);
            onMessage(`Medio cambiado: ${PAYMENT_METHOD_LABELS[method]}`);
          }}
        />
      ) : null}
    </View>
  );
}
