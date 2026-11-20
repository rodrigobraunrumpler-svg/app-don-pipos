import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { useChangePaymentMethod } from "../hooks/use-order-corrections";
import type { Order, Payment, PaymentMethod } from "../schema/order";

// El mismo código ya cambió el medio a otro (una respuesta perdida y después otro medio): no invita a repetir
const CONFLICT_TEXT = "Este pago ya se había cambiado antes. Cierra la hoja para ver cómo quedó.";

type Props = {
  order: Order;
  payment: Payment;
  methods: PaymentMethod[];
  onClose: () => void;
  onDone: (method: PaymentMethod) => void;
};

// Corregir con qué se pagó (o se devolvió): los medios activos menos el de ahora. La base anula el movimiento y crea
// otro igual con el medio correcto; el código es el mismo en cada reintento
export function ChangeMethodSheet({ order, payment, methods, onClose, onDone }: Props) {
  const online = useOnline();
  const change = useChangePaymentMethod(order.id);
  const { requestId } = useRequestId();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  async function save() {
    if (!method) return;
    setFailure(null);
    try {
      await change.mutateAsync({ requestId, paymentId: payment.id, method });
      confirmTap();
      onDone(method);
    } catch (error) {
      setFailure(toAppError(error).kind === "conflict" ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Cambiar medio" onClose={onClose}>
      <Text className="mb-3 text-sm text-text-secondary">
        {`${payment.kind === "refund" ? "Devolución" : "Pago"} de ${formatCents(payment.amountCents)} con ${PAYMENT_METHOD_LABELS[payment.method]}. Elige con qué fue de verdad.`}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {methods
          .filter((item) => item !== payment.method)
          .map((item) => (
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
        <Button
          label={change.isPending ? "Guardando…" : "Guardar medio"}
          disabled={!online || !method || change.isPending}
          onPress={() => void save()}
        />
      </View>
    </Sheet>
  );
}
