import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Notice } from "@/components/ui/notice";
import { ProductAvatar } from "@/features/products";
import { formatTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { useUndoToast } from "../hooks/use-undo-toast";
import { productMovementsQuery, stockOverviewQuery } from "../queries/stock";
import type { StockChangeDone } from "../schema/stock";
import { CountSheet } from "./count-sheet";
import { MovementRow } from "./movement-row";
import { StateChip } from "./state-chip";
import { StockToast } from "./stock-toast";
import { WasteSheet } from "./waste-sheet";

type Props = { productId: string; price: number | undefined; onBack: () => void };

// Un alfajor: su estado, su stock y su mínimo, sus movimientos por páginas, «Contar stock» y «Anotar merma».
// «Cómo se vende» llega en la fase 4, con las ventas. El precio lo trae la pantalla (une productos y stock)
export function ProductStock({ productId, price, onBack }: Props) {
  const online = useOnline();
  const overview = useQuery(stockOverviewQuery);
  const item = overview.data?.find((candidate) => candidate.productId === productId);
  const movements = useInfiniteQuery(productMovementsQuery(productId));
  const [sheet, setSheet] = useState<"waste" | "count" | null>(null);
  const undoToast = useUndoToast();
  const now = new Date();
  const rows = movements.data?.pages.flatMap((page) => page.items) ?? [];
  const total = movements.data?.pages[0]?.meta.total ?? 0;

  function done(result: StockChangeDone) {
    setSheet(null);
    undoToast.show(result);
  }

  const header = (
    <View className="flex-row items-center gap-2 px-3 pb-2 pt-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} hitSlop={8} className="p-2">
        <Icon name="arrow-left" size={24} />
      </Pressable>
      {item ? (
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-extrabold text-2xl text-text">
            {item.name}
          </Text>
          {price !== undefined ? <Text className="text-sm text-text-secondary">{formatCents(price)}</Text> : null}
        </View>
      ) : null}
    </View>
  );

  if (!overview.data) {
    return (
      <View className="flex-1">
        {header}
        {overview.isError ? (
          <LoadError what="el stock" onRetry={() => void overview.refetch()} />
        ) : (
          <View className="px-5 pt-3">
            <SkeletonRows rows={4} />
          </View>
        )}
      </View>
    );
  }
  if (!item) {
    return (
      <View className="flex-1">
        {header}
        <LoadError what="este alfajor" onRetry={() => void overview.refetch()} />
      </View>
    );
  }

  const summary = (
    <View>
      <View className="flex-row items-center gap-4">
        <ProductAvatar product={item} size="large" />
        <View className="gap-1.5">
          <StateChip state={item.state} />
          {item.linkedToWeb ? (
            <View className="flex-row items-center gap-1">
              <Icon
                name={item.onHand > 0 ? "link-variant" : "link-variant-off"}
                size={14}
                tone={item.onHand > 0 ? "olive" : "danger"}
              />
              <Text className={`font-bold text-xs ${item.onHand > 0 ? "text-olive" : "text-danger"}`}>
                {item.onHand > 0 ? "Disponible en la web" : "Agotado en la web"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-md border border-border bg-surface px-4 py-3">
          <Text className="font-extrabold text-2xl text-text">{item.onHand}</Text>
          <Text className="text-[13px] text-text-secondary">en stock</Text>
        </View>
        <View className="flex-1 rounded-md border border-border bg-surface px-4 py-3">
          <Text className="font-extrabold text-2xl text-text">{item.minStock}</Text>
          <Text className="text-[13px] text-text-secondary">mínimo</Text>
        </View>
      </View>
      <View className="mb-1 mt-5 flex-row items-baseline justify-between">
        <Text className="font-extrabold text-lg text-text">Movimientos</Text>
        {movements.data ? (
          <Text className="text-[13px] text-text-secondary">{`Mostrando ${rows.length} de ${total}`}</Text>
        ) : null}
      </View>
      {online ? null : (
        <Notice>
          {movements.data
            ? `Sin conexión. Ves los movimientos de las ${formatTime(new Date(movements.dataUpdatedAt))}.`
            : "Sin conexión. Los movimientos se ven cuando vuelva la señal."}
        </Notice>
      )}
      {/* Sin datos: la carga mientras se piden (también al reintentar), y el error si no llegaron */}
      {!movements.data && movements.isFetching ? <SkeletonRows rows={3} /> : null}
      {!movements.data && !movements.isFetching && movements.isError ? (
        <LoadError what="los movimientos" onRetry={() => void movements.refetch()} />
      ) : null}
      {movements.data && rows.length === 0 ? (
        <Text className="py-3 text-sm text-text-secondary">Todavía no hay movimientos.</Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1">
      {header}
      <FlashList
        testID="movements"
        data={rows}
        keyExtractor={(movement) => movement.id}
        renderItem={({ item: movement }) => <MovementRow movement={movement} now={now} />}
        ListHeaderComponent={summary}
        ListFooterComponent={movements.isFetchingNextPage ? <SkeletonRows rows={1} /> : null}
        onEndReached={() => {
          if (movements.hasNextPage && !movements.isFetchingNextPage) void movements.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      />
      <View className="flex-row gap-3 border-t border-border bg-background px-5 py-3">
        <View className="flex-1">
          <Button label="Contar stock" variant="secondary" disabled={!online} onPress={() => setSheet("count")} />
        </View>
        <View className="flex-1">
          <Button label="Anotar merma" disabled={!online} onPress={() => setSheet("waste")} />
        </View>
      </View>
      {sheet === "waste" ? <WasteSheet productId={productId} onClose={() => setSheet(null)} onDone={done} /> : null}
      {sheet === "count" ? <CountSheet productIds={[productId]} onClose={() => setSheet(null)} onDone={done} /> : null}
      <StockToast
        toast={undoToast.toast}
        onUndo={(requestId) => void undoToast.undo(requestId)}
        onHide={undoToast.hide}
      />
    </View>
  );
}
