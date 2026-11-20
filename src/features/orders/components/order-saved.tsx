import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { businessQuery } from "@/features/businesses";
import { MessagePreview } from "@/features/messages";
import { formatCents } from "@/lib/money";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { orderHeadline } from "../rules/headline";
import { lineLabel } from "../rules/line";
import { messageContext } from "../rules/message";
import { orderNumber } from "../rules/number";
import type { Order } from "../schema/order";
import { SummaryRow } from "./summary-row";

// El pedido recién guardado (guardado de la maqueta): su número, el detalle, cómo va el cobro y la confirmación tal
// como le llega al cliente, con «Avisar por WhatsApp»
export function OrderSaved({ order, onAnother }: { order: Order; onAnother: () => void }) {
  const methods = useQuery({ ...businessQuery, select: (business) => business.settings.activePaymentMethods }).data;
  const name = order.customer?.name ?? order.customerName ?? "";
  const due = order.totalCents - order.paidCents;
  const method = order.payments.find((payment) => payment.kind === "payment")?.method;
  const collection =
    due <= 0
      ? `Pagado${method ? ` con ${PAYMENT_METHOD_LABELS[method]}` : ""}`
      : order.paidCents > 0
        ? `Falta cobrar ${formatCents(due)}`
        : `Se cobra ${formatCents(order.totalCents)} ${order.fulfillment === "pickup" ? "al recoger" : "al recibir"}`;
  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pb-6 pt-6">
        <View className="items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Icon name="check" size={30} tone="onPrimary" />
          </View>
          <Text accessibilityRole="header" className="mt-3 font-extrabold text-2xl text-text">
            {`Pedido ${orderNumber(order.number)} guardado`}
          </Text>
          <Text className="mt-1 text-center text-base text-text-secondary">{orderHeadline(order, new Date())}</Text>
        </View>
        <View className="mt-5 rounded-md border border-border bg-surface px-4 py-3">
          {order.lines.map((line) => (
            <SummaryRow
              key={line.productId}
              label={lineLabel(line.quantity, line.productName)}
              value={formatCents(line.quantity * line.unitPriceCents)}
            />
          ))}
          {order.deliveryFeeCents > 0 ? (
            <SummaryRow label="Delivery" value={formatCents(order.deliveryFeeCents)} />
          ) : null}
          {order.discountCents > 0 ? (
            <SummaryRow label="Descuento" value={`−${formatCents(order.discountCents)}`} />
          ) : null}
          <SummaryRow label="Total" value={formatCents(order.totalCents)} strong />
          <Text className={`mt-1 font-bold text-sm ${due <= 0 ? "text-accent" : "text-text-secondary"}`}>
            {collection}
          </Text>
        </View>
        <View className="mt-6 gap-3">
          <View className="flex-row items-center gap-2">
            <Icon name="whatsapp" size={22} tone="accent" />
            <Text className="font-extrabold text-lg text-text">{`Así le llega a ${name.split(" ")[0]}`}</Text>
          </View>
          <MessagePreview
            templateKey="confirmation"
            context={messageContext(order, methods ?? [])}
            phone={order.customer?.phone}
            actionLabel="Avisar por WhatsApp"
          />
          <Text className="text-[13px] text-text-secondary">El texto del mensaje se cambia en Ajustes.</Text>
        </View>
      </ScrollView>
      <View className="border-t border-border bg-background px-5 py-3">
        <Button variant="secondary" label="Anotar otro pedido" onPress={onAnother} />
      </View>
    </View>
  );
}
