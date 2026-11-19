import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/dates";
import { useOnline } from "@/lib/use-online";
import { useTheme } from "@/theme";

import { useUndoToast } from "../hooks/use-undo-toast";
import { stockOverviewQuery } from "../queries/stock";
import type { StockChangeDone } from "../schema/stock";
import { CountSheet } from "./count-sheet";
import { StockRow } from "./stock-row";
import { StockToast } from "./stock-toast";
import { WasteSheet } from "./waste-sheet";

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
  const undoToast = useUndoToast();
  const hasProducts = (data?.length ?? 0) > 0;
  const canRegister = online && hasProducts;
  const updatedAt = formatTime(new Date(dataUpdatedAt));

  function done(result: StockChangeDone) {
    setSheet(null);
    undoToast.show(result);
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
      <StockToast
        toast={undoToast.toast}
        onUndo={(requestId) => void undoToast.undo(requestId)}
        onHide={undoToast.hide}
      />
    </View>
  );
}
