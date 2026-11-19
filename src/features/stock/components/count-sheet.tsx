import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { ProductAvatar } from "@/features/products";
import { errorMessage } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { useOnline } from "@/lib/use-online";

import { useRequestId } from "../hooks/use-request-id";
import { useRegisterStockCount } from "../hooks/use-stock-changes";
import { stockOverviewQuery } from "../queries/stock";
import { countSaveLabel, differenceLabel, expectedLabel } from "../rules/count";
import type { StockItem } from "../schema/stock";
import type { StockChangeDone } from "./waste-sheet";

type Props = { productIds: string[] | null; onClose: () => void; onDone: (done: StockChangeDone) => void };

// Contar stock: por alfajor, lo que debería haber en la nevera (libre + apartado), lo contado y la diferencia.
// Se mandan todos los contados: la base crea un ajuste solo donde hay diferencia
export function CountSheet({ productIds, onClose, onDone }: Props) {
  const online = useOnline();
  const { data } = useQuery(stockOverviewQuery);
  const count = useRegisterStockCount();
  const { requestId, renew } = useRequestId();
  const [counted, setCounted] = useState<Record<string, number>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const items = (data ?? []).filter((item) => productIds === null || productIds.includes(item.productId));
  const valueOf = (item: StockItem): number => counted[item.productId] ?? Math.max(item.physical, 0);
  const changes = items.filter((item) => valueOf(item) !== item.physical).length;

  async function submit() {
    setProblem(null);
    try {
      const result = await count.mutateAsync({
        requestId,
        counts: items.map((item) => ({ productId: item.productId, counted: valueOf(item) })),
      });
      renew();
      confirmTap();
      const label = result.adjustments === 1 ? "ajuste" : "ajustes";
      onDone({ requestId, message: `Conteo guardado: ${result.adjustments} ${label}.` });
    } catch (error) {
      setProblem(errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Contar stock" onClose={onClose}>
      <Text className="text-sm text-text-secondary">
        Pon lo que hay de verdad. La diferencia queda anotada como ajuste.
      </Text>
      {online ? null : <Notice>Sin conexión. Para registrar, espera la señal.</Notice>}
      <ScrollView className="mt-2">
        {items.map((item) => {
          const difference = valueOf(item) - item.physical;
          return (
            <View key={item.productId} className="flex-row items-center gap-3 border-b border-border py-3">
              <ProductAvatar product={item} size="small" />
              <View className="flex-1">
                <Text className="font-bold text-base text-text">{item.name}</Text>
                <Text className="text-[13px] text-text-secondary">{expectedLabel(item.onHand, item.reserved)}</Text>
              </View>
              <Text
                className={`min-w-10 text-right font-extrabold text-sm ${difference > 0 ? "text-olive" : difference < 0 ? "text-danger" : "text-text-muted"}`}
              >
                {differenceLabel(valueOf(item), item.physical)}
              </Text>
              <Stepper
                value={valueOf(item)}
                onChange={(value) => setCounted((current) => ({ ...current, [item.productId]: value }))}
                label={item.name}
                max={100_000}
              />
            </View>
          );
        })}
      </ScrollView>
      {problem ? <Text className="mt-2 font-bold text-sm text-danger">{problem}</Text> : null}
      <View className="mt-4">
        <Button
          label={count.isPending ? "Guardando…" : countSaveLabel(changes)}
          onPress={() => void submit()}
          disabled={changes === 0 || !online || count.isPending}
        />
      </View>
    </Sheet>
  );
}
