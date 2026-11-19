import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { formatTime } from "@/lib/dates";
import { errorMessage } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { revertStockChangeMutation } from "../queries/mutations";
import { stockOverviewQuery } from "../queries/stock";
import { CountSheet } from "./count-sheet";
import { StockRow } from "./stock-row";
import { WasteSheet, type StockChangeDone } from "./waste-sheet";

type Props = {
  onOpenProduct: (productId: string) => void;
  onRegisterProduction: () => void;
  onGoToProducts: () => void;
};

// La pestaña Stock: cada alfajor con su estado, «Contar stock», «Anotar merma» y «Registrar producción»
export function StockOverview({ onOpenProduct, onRegisterProduction, onGoToProducts }: Props) {
  const online = useOnline();
  const { colors } = useTheme();
  const { data, isError, isRefetching, refetch, dataUpdatedAt } = useQuery(stockOverviewQuery);
  const [sheet, setSheet] = useState<"waste" | "count" | null>(null);
  const [toast, setToast] = useState<{ message: string; undoId: string | null } | null>(null);
  const revert = useMutation(revertStockChangeMutation);
  const hasProducts = (data?.length ?? 0) > 0;
  const canRegister = online && hasProducts;
  const updatedAt = formatTime(new Date(dataUpdatedAt));

  function done({ requestId, message }: StockChangeDone) {
    setSheet(null);
    setToast({ message, undoId: requestId });
  }

  // «Deshacer» del aviso: la base deshace el registro entero (todos sus movimientos)
  async function undo(requestId: string) {
    setToast(null);
    try {
      await revert.mutateAsync(requestId);
      setToast({ message: "Listo, se deshizo.", undoId: null });
    } catch (error) {
      setToast({ message: errorMessage(error), undoId: null });
    }
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-start justify-between px-5 pb-2 pt-4">
        <View>
          <Text accessibilityRole="header" className="font-extrabold text-3xl text-text">
            Stock
          </Text>
          {data ? <Text className="text-sm text-text-secondary">{`Actualizado a las ${updatedAt}`}</Text> : null}
        </View>
        {hasProducts ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Contar stock"
            accessibilityState={{ disabled: !canRegister }}
            disabled={!canRegister}
            onPress={() => setSheet("count")}
            className="min-h-11 flex-row items-center gap-1.5"
          >
            <Icon name="clipboard-check-outline" size={18} tone={canRegister ? "accent" : "textMuted"} />
            <Text className={`font-extrabold text-sm ${canRegister ? "text-accent" : "text-text-muted"}`}>
              Contar stock
            </Text>
          </Pressable>
        ) : null}
      </View>
      {!data && isError ? (
        <LoadError what="el stock" onRetry={() => void refetch()} />
      ) : !data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : !hasProducts ? (
        <View className="items-center px-5 pt-10">
          <Icon name="package-variant" size={42} tone="textMuted" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Todavía no hay productos</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Agrega tus alfajores con su precio en Ajustes para empezar a llevar el stock.
          </Text>
          <View className="mt-5 w-full">
            <Button
              label="Ir a Ajustes"
              icon={<Icon name="cog-outline" size={18} tone="onPrimary" />}
              onPress={onGoToProducts}
            />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-5 pb-6"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {online ? null : (
            <Notice>{`Sin conexión. Ves el stock de las ${updatedAt}; para registrar, espera la señal.`}</Notice>
          )}
          <View className="mt-3 overflow-hidden rounded-md border border-border bg-surface">
            {data.map((item) => (
              <StockRow key={item.productId} item={item} onPress={() => onOpenProduct(item.productId)} />
            ))}
          </View>
        </ScrollView>
      )}
      {hasProducts ? (
        <View className="flex-row gap-3 border-t border-border bg-background px-5 py-3">
          <View className="flex-1">
            <Button label="Anotar merma" variant="secondary" disabled={!online} onPress={() => setSheet("waste")} />
          </View>
          <View className="flex-1">
            <Button label="Registrar producción" disabled={!online} onPress={onRegisterProduction} />
          </View>
        </View>
      ) : null}
      {sheet === "waste" ? <WasteSheet productId={null} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet === "count" ? <CountSheet productIds={null} onClose={() => setSheet(null)} onDone={done} /> : null}
      {toast ? (
        <Toast
          message={toast.message}
          actionLabel={toast.undoId ? "Deshacer" : undefined}
          onAction={toast.undoId ? () => void undo(toast.undoId as string) : undefined}
          onHide={() => setToast(null)}
        />
      ) : null}
    </View>
  );
}
