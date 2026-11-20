import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { Toast } from "@/components/ui/toast";
import { ProductAvatar } from "@/features/products";
import { formatLongDate } from "@/lib/dates";
import { errorMessage, toAppError } from "@/lib/errors";
import { confirmTap } from "@/lib/haptics";
import { useOnline } from "@/lib/use-online";
import { useRequestId } from "@/lib/use-request-id";

import { STOCK_CONFLICT_TEXT } from "../constants";
import { registerProductionMutation, revertStockChangeMutation } from "../queries/mutations";
import { stockOverviewQuery } from "../queries/stock";
import { productionSaveLabel, productionTotal } from "../rules/production";
import { ProductionSaved } from "./production-saved";

type Saved = { requestId: string; total: number; backOnWeb: string[] };
type Props = { onBack: () => void; onSeeStock: () => void };

// Registrar producción: cuántos se hicieron de cada alfajor. La sugerencia llega en la fase 4, con las ventas
export function ProductionForm({ onBack, onSeeStock }: Props) {
  const online = useOnline();
  const { data, isError, refetch } = useQuery(stockOverviewQuery);
  const production = useMutation(registerProductionMutation);
  const revert = useMutation(revertStockChangeMutation);
  const { requestId, renew } = useRequestId();
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Saved | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const total = productionTotal(amounts);
  const today = formatLongDate(new Date());

  async function submit() {
    setProblem(null);
    try {
      const items = (data ?? [])
        .filter((item) => (amounts[item.productId] ?? 0) > 0)
        .map((item) => ({ productId: item.productId, quantity: amounts[item.productId] ?? 0 }));
      const result = await production.mutateAsync({ requestId, items });
      setSaved({ requestId, total: result.total, backOnWeb: result.backOnWeb.map((product) => product.name) });
      renew();
      confirmTap();
    } catch (error) {
      // El mismo código ya se guardó con otros datos: se explica y el siguiente intento es otro registro
      if (toAppError(error).kind === "conflict") renew();
      setProblem(toAppError(error).kind === "conflict" ? STOCK_CONFLICT_TEXT : errorMessage(error));
    }
  }

  async function undo(savedId: string) {
    try {
      await revert.mutateAsync(savedId);
      setSaved(null);
      setAmounts({});
      setToast("Producción deshecha.");
    } catch (error) {
      setToast(errorMessage(error));
    }
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 px-3 pb-2 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={8} className="p-2">
          <Icon name="arrow-left" size={24} />
        </Pressable>
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-extrabold text-2xl text-text">
            Registrar producción
          </Text>
          <Text className="text-sm text-text-secondary">{`Hoy, ${today.charAt(0).toLowerCase()}${today.slice(1)}`}</Text>
        </View>
      </View>
      {saved ? (
        <ProductionSaved
          total={saved.total}
          backOnWeb={saved.backOnWeb}
          undoing={revert.isPending}
          onSeeStock={onSeeStock}
          onUndo={() => void undo(saved.requestId)}
        />
      ) : !data && isError ? (
        <LoadError what="el stock" onRetry={() => void refetch()} />
      ) : !data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="px-5 pb-6">
            {online ? null : <Notice>Sin conexión. Para registrar, espera la señal.</Notice>}
            <View className="mt-3 flex-row gap-2.5 rounded-sm bg-olive-soft px-3 py-3">
              <Icon name="information-outline" size={18} tone="olive" />
              <Text className="flex-1 text-sm text-text">
                Todavía no hay ventas suficientes para sugerir. Anota lo que hiciste y desde la próxima semana la app
                sugiere sola.
              </Text>
            </View>
            <View className="mt-3.5 overflow-hidden rounded-md border border-border bg-surface">
              {data.map((item) => (
                <View
                  key={item.productId}
                  className="min-h-[68px] flex-row items-center gap-3 border-b border-border px-3.5 py-3"
                >
                  <ProductAvatar product={item} />
                  <View className="flex-1">
                    <Text numberOfLines={2} className="font-extrabold text-base text-text">
                      {item.name}
                    </Text>
                    <Text numberOfLines={2} className="text-[13px] text-text-secondary">
                      Anota cuántos hiciste
                    </Text>
                  </View>
                  <Stepper
                    value={amounts[item.productId] ?? 0}
                    onChange={(value) => setAmounts((current) => ({ ...current, [item.productId]: value }))}
                    label={item.name}
                  />
                </View>
              ))}
            </View>
            {problem ? <Text className="mt-2 font-bold text-sm text-danger">{problem}</Text> : null}
          </ScrollView>
          <View className="border-t border-border bg-background px-5 py-3">
            <Button
              label={production.isPending ? "Guardando…" : productionSaveLabel(total)}
              onPress={() => void submit()}
              disabled={total === 0 || !online || production.isPending}
            />
          </View>
        </>
      )}
      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}
