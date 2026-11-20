import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { errorMessage, toAppError } from "@/lib/errors";
import { formatCents } from "@/lib/money";

import { useRevertCancel, useRevertEdit } from "../hooks/use-order-corrections";
import { orderNumber } from "../rules/number";
import { canEdit } from "../rules/status";
import type { Order, PaymentMethod } from "../schema/order";
import { CancelOrderSheet } from "./cancel-order-sheet";
import { EditOrderSheet } from "./edit-order-sheet";

export type OrderMessage = { text: string; onUndo?: () => void };
type Props = { order: Order; methods: PaymentMethod[]; online: boolean; onMessage: (message: OrderMessage) => void };

const undoFailure = (error: unknown) => {
  const kind = toAppError(error).kind;
  if (kind === "invalid") return "Ya no se puede deshacer: pasaron más de 10 minutos.";
  return kind === "conflict" ? "El pedido cambió después: ya no se puede deshacer." : errorMessage(error);
};

// Al final de Un pedido, como en la maqueta: «Editar pedido» (antes de entregar) y «Anular» (en cualquier estado menos
// anulado), cada uno en su hoja y con «Deshacer» en el aviso. Sigue montado con el pedido anulado: el «Deshacer» de
// la anulación usa sus llamadas
export function OrderCorrections({ order, methods, online, onMessage }: Props) {
  const [sheet, setSheet] = useState<"edit" | "cancel" | null>(null);
  const revertEdit = useRevertEdit(order.id);
  const revertCancel = useRevertCancel(order.id);
  const number = orderNumber(order.number);
  const undone = (text: string) => ({
    onSuccess: () => onMessage({ text }),
    onError: (error: unknown) => onMessage({ text: undoFailure(error) }),
  });

  function edited(updated: Order) {
    setSheet(null);
    onMessage({
      text: `Pedido ${number} actualizado: ${formatCents(updated.totalCents)}`,
      onUndo: () =>
        revertEdit.mutate({ orderId: order.id, version: updated.version }, undone(`Pedido ${number}: se deshizo el cambio.`)),
    });
  }

  function cancelled() {
    setSheet(null);
    onMessage({
      text: `Pedido ${number} anulado`,
      onUndo: () => revertCancel.mutate(order.id, undone(`Pedido ${number}: se deshizo la anulación.`)),
    });
  }

  if (order.status === "cancelled") return null;
  return (
    <View className="mt-6 gap-1">
      {canEdit(order.status) ? (
        <Button
          variant="secondary"
          label="Editar pedido"
          icon={<Icon name="pencil-outline" size={18} tone={online ? "text" : "textMuted"} />}
          disabled={!online}
          onPress={() => setSheet("edit")}
        />
      ) : null}
      <Button
        variant="dangerText"
        label="Anular"
        icon={<Icon name="close-circle-outline" size={18} tone={online ? "danger" : "textMuted"} />}
        disabled={!online}
        onPress={() => setSheet("cancel")}
      />
      {sheet === "edit" ? (
        <EditOrderSheet order={order} methods={methods} onClose={() => setSheet(null)} onDone={edited} />
      ) : null}
      {sheet === "cancel" ? (
        <CancelOrderSheet order={order} methods={methods} onClose={() => setSheet(null)} onDone={cancelled} />
      ) : null}
    </View>
  );
}
