import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { ProductAvatar, productsQuery } from "@/features/products";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { useEditOrder } from "../hooks/use-order-corrections";
import { orderNumber } from "../rules/number";
import type { Order, PaymentMethod } from "../schema/order";

type Props = { order: Order; methods: PaymentMethod[]; onClose: () => void; onDone: (order: Order) => void };

const CONFLICT_TEXT = "Este pedido cambió mientras lo editabas. Ciérralo y vuelve a abrirlo para ver cómo quedó.";

// Editar un pedido (la hoja de la maqueta): lo que ya estaba, con su precio congelado, y después los alfajores activos
// que no lleva, al precio de hoy. Si el total baja de lo pagado, la devolución de la diferencia va en el mismo cambio.
// ponytail: un total negativo (descuento mayor que lo que queda) lo rechaza la base con su mensaje
export function EditOrderSheet({ order, methods, onClose, onDone }: Props) {
  const online = useOnline();
  const edit = useEditOrder(order.id);
  const { requestId } = useRequestId();
  const catalog = useQuery(productsQuery).data ?? [];
  const before = Object.fromEntries(order.lines.map((line) => [line.productId, line.quantity]));
  const [quantities, setQuantities] = useState<Record<string, number>>(before);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const rows = [
    ...order.lines.map((line) => ({
      id: line.productId,
      name: line.productName,
      imageUrl: catalog.find((product) => product.id === line.productId)?.imageUrl ?? null,
      priceCents: line.unitPriceCents,
    })),
    ...catalog
      .filter((product) => product.isActive && !(product.id in before))
      .map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
      })),
  ];
  const quantity = (id: string) => quantities[id] ?? 0;
  const lines = rows
    .filter((row) => quantity(row.id) > 0)
    .map((row) => ({ productId: row.id, quantity: quantity(row.id) }));
  const total =
    rows.reduce((sum, row) => sum + quantity(row.id) * row.priceCents, 0) +
    order.deliveryFeeCents -
    order.discountCents;
  const changed = rows.some((row) => quantity(row.id) !== (before[row.id] ?? 0));
  const refundCents = lines.length ? Math.max(order.paidCents - total, 0) : 0;

  async function save() {
    setFailure(null);
    try {
      const updated = await edit.mutateAsync({
        requestId,
        orderId: order.id,
        expectedVersion: order.version,
        lines,
        refund: refundCents && method ? { cents: refundCents, method } : null,
      });
      confirmTap();
      onDone(updated);
    } catch (error) {
      setFailure(toAppError(error).kind === "conflict" ? CONFLICT_TEXT : errorMessage(error));
    }
  }

  return (
    <Sheet visible title={`Editar el pedido ${orderNumber(order.number)}`} onClose={onClose}>
      <Text className="text-sm text-text-secondary">
        Lo que ya estaba conserva su precio; lo que agregues va al precio de hoy.
      </Text>
      {online ? null : <Notice>Sin conexión. Para guardar, espera la señal.</Notice>}
      <ScrollView className="mt-2">
        {rows.map((row) => (
          <View key={row.id} className="flex-row items-center gap-3 border-b border-border py-3">
            <ProductAvatar product={row} size="small" />
            <View className="flex-1">
              <Text numberOfLines={2} className="font-bold text-base text-text">
                {row.name}
              </Text>
              <Text className="text-[13px] text-text-secondary">{`${formatCents(row.priceCents)} c/u`}</Text>
            </View>
            <Stepper
              value={quantity(row.id)}
              onChange={(value) => setQuantities((current) => ({ ...current, [row.id]: value }))}
              label={row.name}
            />
          </View>
        ))}
      </ScrollView>
      <Text className="mt-3 font-extrabold text-lg text-text">{`Nuevo total: ${formatCents(total)}`}</Text>
      {refundCents ? (
        <View className="mt-2 gap-2">
          <Text className="font-bold text-sm text-text">{`Devuelves ${formatCents(refundCents)}: elige con qué.`}</Text>
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
        </View>
      ) : null}
      <View className="mt-4 gap-2 pb-2">
        {failure ? <Text className="font-bold text-sm text-danger">{failure}</Text> : null}
        <Button
          label={!lines.length ? "Deja al menos un alfajor" : edit.isPending ? "Guardando…" : "Guardar cambios"}
          disabled={!online || !changed || !lines.length || (refundCents > 0 && !method) || edit.isPending}
          onPress={() => void save()}
        />
      </View>
    </Sheet>
  );
}
