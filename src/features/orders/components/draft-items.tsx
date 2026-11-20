import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { ProductAvatar, productsQuery } from "@/features/products";
import { stockOverviewQuery } from "@/features/stock";
import { formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { overStockWarning, stockHint } from "../rules/stock-hint";
import { draftTotal } from "../rules/totals";

type Props = {
  quantities: Record<string, number>;
  onQuantity: (productId: string, quantity: number) => void;
  recoveredAt: string | null;
  onStartOver: () => void;
  onBack: () => void;
  onNext: () => void;
};

// Nuevo pedido, paso 1 (pedido1 de la maqueta): cada alfajor con su precio, cuánto queda y su contador. Pedir más de
// lo que hay avisa sin bloquear (D12). Sin señal también se arma: el borrador queda en el celular
export function DraftItems({ quantities, onQuantity, recoveredAt, onStartOver, onBack, onNext }: Props) {
  const online = useOnline();
  const products = useQuery({ ...productsQuery, select: (list) => list.filter((product) => product.isActive) });
  const stock = useQuery(stockOverviewQuery);
  const chosen = (products.data ?? []).filter((product) => (quantities[product.id] ?? 0) > 0);
  const { subtotalCents } = draftTotal({
    lines: chosen.map((product) => ({ quantity: quantities[product.id] ?? 0, unitPriceCents: product.priceCents })),
    deliveryFeeCents: 0,
    discountCents: 0,
  });
  const units = chosen.reduce((sum, product) => sum + (quantities[product.id] ?? 0), 0);

  return (
    <View className="flex-1">
      <FormHeader title="Nuevo pedido" subtitle="Paso 1 de 2: qué lleva" onBack={onBack} />
      {!products.data && products.isError ? (
        <LoadError what="los alfajores" onRetry={() => void products.refetch()} />
      ) : !products.data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-5 pb-6">
          {recoveredAt ? (
            <View className="mt-3 flex-row items-center gap-2.5 rounded-sm bg-olive-soft px-3 py-2">
              <Icon name="history" size={18} tone="olive" />
              <Text className="flex-1 text-sm text-text">
                {`Recuperamos el pedido que dejaste a medias a las ${formatTime(new Date(recoveredAt))}.`}
              </Text>
              <View>
                <Button variant="text" label="Empezar de nuevo" onPress={onStartOver} />
              </View>
            </View>
          ) : null}
          {online ? null : (
            <Notice>
              Sin conexión. Puedes armar el pedido: queda guardado en el celular hasta que vuelva la señal.
            </Notice>
          )}
          {products.data.length === 0 ? (
            <Text className="pt-6 text-center text-base text-text-secondary">
              Agrega tus alfajores con su precio en Ajustes para anotar pedidos.
            </Text>
          ) : (
            <View className="mt-3.5 overflow-hidden rounded-md border border-border bg-surface">
              {products.data.map((product) => {
                const quantity = quantities[product.id] ?? 0;
                const level = stock.data?.find((item) => item.productId === product.id);
                const hint = level ? stockHint(level) : null;
                const warning = level ? overStockWarning(quantity, level.onHand) : null;
                return (
                  <View key={product.id} className="border-b border-border">
                    <View className="min-h-[68px] flex-row items-center gap-3 px-4 py-3">
                      <ProductAvatar product={product} />
                      <View className="flex-1">
                        <Text className="font-extrabold text-base text-text">{product.name}</Text>
                        <Text className="text-[13px] text-text-secondary">{formatCents(product.priceCents)}</Text>
                        {hint ? (
                          <Text className={`font-bold text-[13px] ${hint.low ? "text-danger" : "text-text-secondary"}`}>
                            {hint.text}
                          </Text>
                        ) : null}
                      </View>
                      <Stepper
                        value={quantity}
                        onChange={(value) => onQuantity(product.id, value)}
                        label={product.name}
                      />
                    </View>
                    {warning ? (
                      <View className="flex-row gap-2 bg-warning-soft px-4 py-2.5">
                        <Icon name="alert-outline" size={18} tone="warning" />
                        <Text className="flex-1 text-sm text-text">{warning}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
      <View className="flex-row items-center gap-3 border-t border-border bg-background px-5 py-3">
        <View className="flex-1">
          <Text className="text-sm text-text-secondary">
            {!products.data
              ? "Cargando alfajores…"
              : units
                ? `${units} ${units === 1 ? "alfajor" : "alfajores"}`
                : "Elige al menos un alfajor"}
          </Text>
          <Text className="font-extrabold text-xl text-text">{formatCents(subtotalCents)}</Text>
        </View>
        <View className="w-40">
          <Button label="Seguir" disabled={units === 0} onPress={onNext} />
        </View>
      </View>
    </View>
  );
}
