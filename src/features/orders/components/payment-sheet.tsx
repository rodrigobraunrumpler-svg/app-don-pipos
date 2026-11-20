import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { MoneyInput } from "@/components/ui/money-input";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { useAddPayment } from "../hooks/use-order-changes";
import { orderNumber } from "../rules/number";
import type { Order, PaymentMethod } from "../schema/order";

type Props = {
  order: Order;
  atDelivery: boolean;
  methods: PaymentMethod[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

const CONFLICT_TEXT =
  "Este pago ya se había guardado antes de tu cambio. Revisa los pagos del pedido antes de registrarlo otra vez.";

// Registrar un pago (o «¿Ya cobraste?» al entregar con saldo): todo lo que falta por defecto, nunca más, y el medio.
// Al entregar, el efectivo viene marcado
export function PaymentSheet({ order, atDelivery, methods, onClose, onSaved }: Props) {
  const online = useOnline();
  const pay = useAddPayment();
  const { requestId, renew } = useRequestId();
  const due = order.totalCents - order.paidCents;
  const [text, setText] = useState((due / 100).toFixed(2));
  const [method, setMethod] = useState<PaymentMethod | null>(atDelivery && methods.includes("cash") ? "cash" : null);
  const [failure, setFailure] = useState<string | null>(null);
  const amount = parseSoles(text) ?? 0;
  const problem =
    amount < 1
      ? "Escribe cuánto te pagó."
      : amount > due
        ? `No puede pasar de lo que falta: ${formatCents(due)}.`
        : !method
          ? "Elige con qué pagó."
          : null;

  async function save() {
    if (problem || !method) return;
    setFailure(null);
    try {
      await pay.mutateAsync({ requestId, orderId: order.id, method, amountCents: amount });
      renew();
      confirmTap();
      onSaved(`Pago guardado: ${formatCents(amount)} con ${PAYMENT_METHOD_LABELS[method]}`);
    } catch (error) {
      // El mismo código ya se usó con otro monto: lo dice, y el siguiente intento es otro pago
      const conflict = toAppError(error).kind === "conflict";
      if (conflict) renew();
      setFailure(conflict ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <Sheet visible title={atDelivery ? "¿Ya cobraste?" : "Registrar pago"} onClose={onClose}>
      <Text className="mb-3 text-sm text-text-secondary">
        {`Falta cobrar ${formatCents(due)} del pedido ${orderNumber(order.number)}.`}
      </Text>
      <MoneyInput label="Monto del pago en soles" value={text} onChangeText={setText} />
      <Text className="mb-2 mt-4 font-bold text-sm text-text-secondary">Medio de pago</Text>
      <View className="flex-row flex-wrap gap-2">
        {methods.map((item) => (
          <Chip
            key={item}
            label={PAYMENT_METHOD_LABELS[item]}
            selected={method === item}
            onPress={() => setMethod(item)}
          />
        ))}
      </View>
      <View className="mt-4 gap-2 pb-2">
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        {problem && !failure ? <Text className="text-sm text-text-secondary">{problem}</Text> : null}
        <Button
          label={pay.isPending ? "Guardando…" : "Guardar pago"}
          disabled={!online || Boolean(problem) || pay.isPending}
          onPress={() => void save()}
        />
        {atDelivery ? <Button variant="text" label="Todavía no, queda por cobrar" onPress={onClose} /> : null}
      </View>
    </Sheet>
  );
}
