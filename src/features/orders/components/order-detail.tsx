import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { businessQuery } from "@/features/businesses";
import { formatPhone } from "@/features/customers";
import { MessagePreview } from "@/features/messages";
import { formatTime } from "@/lib/dates";
import { errorMessage, toAppError } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { STATUS_ICONS, STATUS_LABELS, STATUS_TEMPLATES } from "../constants";
import { useAdvanceOrder, useRevertStatus } from "../hooks/use-order-changes";
import { orderQuery } from "../queries/orders";
import { orderHeadline } from "../rules/headline";
import { messageContext } from "../rules/message";
import { orderNumber } from "../rules/number";
import { nextStatus, nextStatusLabel } from "../rules/status";
import type { OrderStatus } from "../schema/order";
import { OrderCorrections, type OrderMessage } from "./order-corrections";
import { OrderItems } from "./order-items";
import { OrderPayments } from "./order-payments";
import { OrderTimeline } from "./order-timeline";
import { PaymentSheet } from "./payment-sheet";
import { StatusChip } from "./status-chip";

type Props = { orderId: string; onBack: () => void };

// Un pedido (PANTALLAS.pedido): su línea de tiempo y la acción que toca, fija abajo (el siguiente estado o, ya
// entregado, cobrar lo que falta). Cambiar de estado se ve al instante, se puede deshacer en el aviso y vuelve atrás si
// no se guardó. Abajo, el mensaje de WhatsApp del estado, lo que lleva, los pagos, el cliente y editar o anular
export function OrderDetail({ orderId, onBack }: Props) {
  const online = useOnline();
  const { data: order, isError, refetch, dataUpdatedAt } = useQuery(orderQuery(orderId));
  const methods = useQuery({ ...businessQuery, select: (business) => business.settings.activePaymentMethods }).data;
  const advance = useAdvanceOrder(orderId);
  const revert = useRevertStatus(orderId);
  const [sheet, setSheet] = useState<"pay" | "delivery" | null>(null);
  const [message, setMessage] = useState<OrderMessage | null>(null);
  const hideMessage = useCallback(() => setMessage(null), []);
  // «Deshacer» se va del aviso al tocarlo: un segundo toque con la señal lenta mandaba otro deshacer
  const runUndo = (undo?: () => void) => {
    setMessage(null);
    undo?.();
  };
  const now = new Date();

  if (!order)
    return (
      <View className="flex-1">
        <FormHeader title="Pedido" onBack={onBack} />
        {isError ? (
          <LoadError what="el pedido" onRetry={() => void refetch()} />
        ) : (
          <View className="px-5 pt-3">
            <SkeletonRows rows={5} />
          </View>
        )}
      </View>
    );

  const number = orderNumber(order.number);
  const next = order.status === "cancelled" ? null : nextStatus(order.fulfillment, order.status);
  const due = order.totalCents - order.paidCents;
  const canPay = due > 0 && order.status !== "cancelled";
  const template = STATUS_TEMPLATES[order.status];
  const phone = order.customer?.phone ?? null;
  const customerName = order.customer?.name ?? order.customerName ?? "";

  function advanceTo(from: OrderStatus, to: OrderStatus) {
    setMessage({ text: `${number}: ${STATUS_LABELS[to].toLowerCase()}`, onUndo: () => undo(to) });
    advance.mutate(
      { orderId, fromStatus: from },
      {
        // Entregado con saldo: pregunta si ya cobró
        onSuccess: (updated) => {
          if (updated.status === "delivered" && updated.totalCents > updated.paidCents) setSheet("delivery");
        },
        onError: (error) =>
          setMessage({
            text:
              toAppError(error).kind === "conflict"
                ? errorMessage(error)
                : `No se pudo guardar: el pedido volvió a «${STATUS_LABELS[from]}». Revisa la señal y vuelve a intentar.`,
          }),
      },
    );
  }

  function undo(status: OrderStatus) {
    setMessage(null);
    revert.mutate(
      { orderId, expectedStatus: status },
      {
        onSuccess: (updated) => setMessage({ text: `${number}: volvió a «${STATUS_LABELS[updated.status]}».` }),
        onError: (error) =>
          setMessage({
            text:
              toAppError(error).kind === "invalid"
                ? "Ya no se puede deshacer: pasaron más de 10 minutos."
                : errorMessage(error),
          }),
      },
    );
  }

  return (
    <View className="flex-1">
      <FormHeader title={`Pedido ${number}`} subtitle={orderHeadline(order, now)} onBack={onBack} />
      <ScrollView contentContainerClassName="px-5 pb-6">
        {online ? null : (
          <Notice>{`Sin conexión. Ves el pedido de las ${formatTime(new Date(dataUpdatedAt))}; para cambiarlo, espera la señal.`}</Notice>
        )}
        {order.status === "cancelled" ? (
          <View className="mt-3.5 flex-row gap-2.5 rounded-sm bg-danger-soft px-3 py-3">
            <Icon name="close-circle-outline" size={17} tone="danger" />
            <Text className="flex-1 font-semibold text-sm text-text">
              {`Pedido anulado: ${(order.cancelReason ?? "sin motivo").toLowerCase()}. Los alfajores volvieron al stock.`}
            </Text>
          </View>
        ) : null}
        <View className="mt-3 flex-row">
          <StatusChip status={order.status} />
        </View>
        <OrderTimeline order={order} />
        {template && phone && order.status !== "cancelled" ? (
          <View className="mt-6 gap-3">
            <View className="flex-row items-center gap-2">
              <Icon name="whatsapp" size={22} tone="accent" />
              <Text className="flex-1 font-extrabold text-lg text-text">
                {`Avisar «${STATUS_LABELS[order.status].toLowerCase()}» a ${customerName.split(" ")[0]}`}
              </Text>
            </View>
            <MessagePreview templateKey={template} context={messageContext(order, methods ?? [])} phone={phone} />
          </View>
        ) : null}
        <OrderItems order={order} />
        <OrderPayments
          order={order}
          now={now}
          canPay={canPay}
          disabled={!online}
          methods={methods ?? []}
          onPay={() => setSheet("pay")}
          onMessage={(text) => setMessage({ text })}
        />
        {order.customer ? (
          <View className="mt-5">
            <Text accessibilityRole="header" className="font-extrabold text-lg text-text">
              Cliente
            </Text>
            <View className="mt-2 rounded-md border border-border bg-surface px-4 py-3">
              <Text className="font-bold text-base text-text">{order.customer.name}</Text>
              <Text className="text-sm text-text-secondary">
                {[
                  order.customer.phone ? formatPhone(order.customer.phone) : null,
                  order.deliveryAddress ?? order.customer.address,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          </View>
        ) : null}
        <OrderCorrections order={order} methods={methods ?? []} online={online} onMessage={setMessage} />
      </ScrollView>
      {next || canPay ? (
        <View className="border-t border-border bg-background px-5 py-3">
          {next ? (
            <Button
              label={nextStatusLabel(next)}
              icon={<Icon name={STATUS_ICONS[next]} size={18} tone={online ? "onPrimary" : "textMuted"} />}
              disabled={!online || advance.isPending || revert.isPending}
              onPress={() => advanceTo(order.status, next)}
            />
          ) : (
            <Button
              label={`Registrar pago de ${formatCents(due)}`}
              icon={<Icon name="hand-coin-outline" size={18} tone={online ? "onPrimary" : "textMuted"} />}
              disabled={!online}
              onPress={() => setSheet("pay")}
            />
          )}
        </View>
      ) : null}
      {sheet ? (
        <PaymentSheet
          order={order}
          atDelivery={sheet === "delivery"}
          methods={methods ?? []}
          onClose={() => setSheet(null)}
          onSaved={(text) => {
            setSheet(null);
            setMessage({ text });
          }}
        />
      ) : null}
      {message ? (
        <Toast
          message={message.text}
          actionLabel={message.onUndo ? "Deshacer" : undefined}
          onAction={message.onUndo ? () => runUndo(message.onUndo) : undefined}
          onHide={hideMessage}
        />
      ) : null}
    </View>
  );
}
