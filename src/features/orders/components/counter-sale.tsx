import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { businessQuery } from "@/features/businesses";
import { ProductAvatar, productsQuery } from "@/features/products";
import { stockOverviewQuery } from "@/features/stock";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { PAYMENT_METHOD_LABELS } from "../constants";
import { useCreateCounterSale } from "../hooks/use-order-changes";
import { orderNumber } from "../rules/number";
import type { PaymentMethod } from "../schema/order";

// En el orden de PAYMENT_METHOD_LABELS: en el mostrador, efectivo primero
const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// La venta de mostrador (PANTALLAS.venta): sin cliente, se toca cada alfajor y se cobra con un toque en el medio.
// Espera la respuesta y queda vacía para la siguiente. Pedir más de lo que hay avisa sin bloquear (D12)
export function CounterSale({ onBack }: { onBack: () => void }) {
  const online = useOnline();
  const products = useQuery({ ...productsQuery, select: (list) => list.filter((product) => product.isActive) });
  const stock = useQuery(stockOverviewQuery);
  const active = useQuery({ ...businessQuery, select: (business) => business.settings.activePaymentMethods }).data;
  const sale = useCreateCounterSale();
  const { requestId, renew } = useRequestId();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const hideToast = useCallback(() => setToast(null), []);
  const chosen = (products.data ?? []).filter((product) => (quantities[product.id] ?? 0) > 0);
  const units = chosen.reduce((sum, product) => sum + (quantities[product.id] ?? 0), 0);
  const total = chosen.reduce((sum, product) => sum + (quantities[product.id] ?? 0) * product.priceCents, 0);
  const methods = METHODS.filter((method) => active?.includes(method));
  const setQuantity = (productId: string, quantity: number) =>
    setQuantities((current) => ({ ...current, [productId]: quantity }));

  async function charge(method: PaymentMethod) {
    try {
      const order = await sale.mutateAsync({
        requestId,
        items: chosen.map((product) => ({ productId: product.id, quantity: quantities[product.id] ?? 0 })),
        method,
      });
      renew();
      confirmTap();
      setQuantities({});
      setToast(`Venta guardada: ${orderNumber(order.number)}, ${formatCents(order.totalCents)}.`);
    } catch (error) {
      if (toAppError(error).kind === "conflict") renew();
      setToast(errorMessage(error));
    }
  }

  return (
    <View className="flex-1">
      <FormHeader title="Venta de mostrador" subtitle="Sin cliente: se cobra en el momento" onBack={onBack} />
      {!products.data && products.isError ? (
        <LoadError what="los alfajores" onRetry={() => void products.refetch()} />
      ) : !products.data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-6">
          {online ? null : <Notice>Sin conexión. Para cobrar, espera la señal.</Notice>}
          <View className="mt-3.5 overflow-hidden rounded-md border border-border bg-surface">
            {products.data.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              const level = stock.data?.find((item) => item.productId === product.id);
              const left = level ? level.onHand - quantity : null;
              return (
                <View
                  key={product.id}
                  className="min-h-[68px] flex-row items-center gap-3 border-b border-border px-4 py-3"
                >
                  <ProductAvatar product={product} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Sumar un ${product.name}`}
                    onPress={() => setQuantity(product.id, quantity + 1)}
                    className="flex-1"
                  >
                    <Text className="font-extrabold text-base text-text">{product.name}</Text>
                    <Text className="text-[13px] text-text-secondary">{formatCents(product.priceCents)}</Text>
                    {left === null ? null : (
                      <Text className={`font-bold text-[13px] ${left <= 0 ? "text-danger" : "text-text-secondary"}`}>
                        {left <= 0 ? "Sin stock" : `Quedan ${left}`}
                      </Text>
                    )}
                  </Pressable>
                  <Stepper value={quantity} onChange={(value) => setQuantity(product.id, value)} label={product.name} />
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
      <View className="gap-3 border-t border-border bg-background px-5 py-3">
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-sm text-text-secondary">
            {units ? `${units} ${units === 1 ? "alfajor" : "alfajores"}` : "Toca un alfajor para sumarlo"}
          </Text>
          {units ? (
            <View>
              <Button variant="text" label="Vaciar" onPress={() => setQuantities({})} />
            </View>
          ) : null}
          <Text className="font-extrabold text-xl text-text">{formatCents(total)}</Text>
        </View>
        <Text className="font-bold text-sm text-text-secondary">Cobrar con</Text>
        <View className="flex-row flex-wrap gap-2">
          {methods.map((method) => (
            <View key={method} className="min-w-[46%] flex-1">
              <Button
                variant="secondary"
                label={PAYMENT_METHOD_LABELS[method]}
                disabled={!online || units === 0 || sale.isPending}
                onPress={() => void charge(method)}
              />
            </View>
          ))}
        </View>
      </View>
      {toast ? <Toast message={toast} onHide={hideToast} /> : null}
    </View>
  );
}
