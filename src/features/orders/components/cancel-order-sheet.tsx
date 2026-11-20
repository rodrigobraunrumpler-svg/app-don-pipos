import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { MoneyInput } from "@/components/ui/money-input";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents, parseSoles } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { useCancelOrder } from "../hooks/use-order-corrections";
import { orderNumber } from "../rules/number";
import type { Order, PaymentMethod } from "../schema/order";

type Props = { order: Order; methods: PaymentMethod[]; onClose: () => void; onDone: (order: Order) => void };

const REASONS = ["El cliente canceló", "Error al anotar", "Sin stock", "Otro"];
// El mismo código ya anuló con otros datos (una respuesta perdida y después un cambio): no invita a repetir
const CONFLICT_TEXT = "Este pedido ya se había anulado antes de tu cambio. Cierra la hoja para ver cómo quedó.";

// Anular (la hoja de la maqueta): el motivo, sin uno marcado de antemano, y con pagos, cuánto se devolvió (todo por
// defecto; se puede bajar, también a 0) y con qué (el medio del último pago)
export function CancelOrderSheet({ order, methods, onClose, onDone }: Props) {
  const online = useOnline();
  const cancel = useCancelOrder(order.id);
  const { requestId } = useRequestId();
  const last = order.payments.filter((payment) => payment.kind === "payment" && !payment.voidedAt).at(-1)?.method;
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState((order.paidCents / 100).toFixed(2));
  const [method, setMethod] = useState<PaymentMethod | null>(last && methods.includes(last) ? last : null);
  const [failure, setFailure] = useState<string | null>(null);
  const refund = order.paidCents > 0 ? parseSoles(text) : 0;
  const problem = !reason
    ? "Elige el motivo."
    : refund === null
      ? "Escribe cuánto devolviste; 0 si no devolviste nada."
      : refund > order.paidCents
        ? `No puede pasar de lo pagado: ${formatCents(order.paidCents)}.`
        : refund > 0 && !method
          ? "Elige con qué devolviste."
          : null;

  async function save() {
    if (problem || !reason) return;
    setFailure(null);
    try {
      const updated = await cancel.mutateAsync({
        requestId,
        orderId: order.id,
        reason,
        refund: refund && method ? { cents: refund, method } : null,
      });
      confirmTap();
      onDone(updated);
    } catch (error) {
      setFailure(toAppError(error).kind === "conflict" ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <Sheet visible title={`Anular el pedido ${orderNumber(order.number)}`} onClose={onClose}>
      <Text className="text-sm text-text-secondary">
        Los alfajores vuelven al stock. El pedido no se borra: queda como anulado, con su motivo.
      </Text>
      {online ? null : <Notice>Sin conexión. Para anular, espera la señal.</Notice>}
      <Text className="mb-2 mt-4 font-bold text-sm text-text-secondary">Motivo</Text>
      <View className="flex-row flex-wrap gap-2">
        {REASONS.map((item) => (
          <Chip key={item} label={item} selected={reason === item} onPress={() => setReason(item)} />
        ))}
      </View>
      {order.paidCents > 0 ? (
        <View className="mt-4 gap-2">
          <Text className="font-bold text-sm text-text-secondary">¿Devolviste el dinero?</Text>
          <MoneyInput label="Monto devuelto en soles" value={text} onChangeText={setText} />
          {refund ? (
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
          ) : null}
        </View>
      ) : null}
      <View className="mt-4 gap-2 pb-2">
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        {problem && !failure ? <Text className="text-sm text-text-secondary">{problem}</Text> : null}
        <Button
          variant="danger"
          label={cancel.isPending ? "Anulando…" : "Anular pedido"}
          disabled={!online || Boolean(problem) || cancel.isPending}
          onPress={() => void save()}
        />
        <Button variant="text" label="No, dejarlo como está" onPress={onClose} />
      </View>
    </Sheet>
  );
}
