import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { FormHeader } from "@/components/ui/form-header";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { formatTime } from "@/lib/dates";
import { errorMessage, isRetryable, toAppError } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import { useOnline } from "@/lib/use-online";

import { useRevertExpenseChange } from "../hooks/use-expense-changes";
import { expensesQuery, expensesSummaryQuery } from "../queries/expenses";
import { monthRange } from "../rules/expense";
import type { Expense } from "../schema/expense";
import { CategoryBars } from "./category-bars";
import { ExpenseRow } from "./expense-row";
import { ExpenseSheet, type ExpenseDone } from "./expense-sheet";
import { FailedPhotos } from "./failed-photos";

type Props = { onBack: () => void; onNew: () => void };
type Message = { text: string; onUndo?: () => void };

// Gastos (PANTALLAS.gastos): «Gastado en noviembre» con las barras por tipo, «Anotar gasto» y los gastos de 20 en 20.
// Tocar uno abre su hoja para corregirlo, anularlo o agregarle la boleta; el aviso trae «Deshacer»
export function ExpensesOverview({ onBack, onNew }: Props) {
  const online = useOnline();
  const now = new Date();
  const month = monthRange(now);
  const summary = useQuery(expensesSummaryQuery(month.from, month.to)).data;
  const list = useInfiniteQuery(expensesQuery);
  const revert = useRevertExpenseChange();
  const [open, setOpen] = useState<Expense | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const hideMessage = useCallback(() => setMessage(null), []);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;

  function undo(expenseId: string) {
    revert.mutate(expenseId, {
      onSuccess: () => setMessage({ text: "Se deshizo el cambio." }),
      onError: (error) =>
        setMessage({
          text:
            toAppError(error).kind === "conflict"
              ? "Ya no se puede deshacer: pasaron más de 10 minutos o hubo otro cambio."
              : errorMessage(error),
          onUndo: isRetryable(error) ? () => undo(expenseId) : undefined,
        }),
    });
  }

  function done(result: ExpenseDone) {
    const undoId = result.undoId;
    setOpen(null);
    setMessage({ text: result.text, onUndo: undoId ? () => undo(undoId) : undefined });
  }

  const header = (
    <View className="pb-2">
      {online ? null : (
        <Notice>{`Sin conexión. Ves los gastos de las ${formatTime(new Date(list.dataUpdatedAt))}.`}</Notice>
      )}
      <FailedPhotos />
      <View className="mt-3 rounded-md border border-border bg-surface px-4 py-4">
        <Text className="text-sm text-text-secondary">{`Gastado en ${month.label}`}</Text>
        <Text className="font-extrabold text-3xl text-text">{formatCents(summary?.totalCents ?? 0)}</Text>
        {summary ? <CategoryBars summary={summary} /> : null}
      </View>
      <View className="mt-3">
        <Button
          label="Anotar gasto"
          icon={<Icon name="plus" size={18} tone="onPrimary" />}
          disabled={!online}
          onPress={onNew}
        />
      </View>
      <Text accessibilityRole="header" className="mt-5 font-extrabold text-lg text-text">
        Últimos gastos
      </Text>
    </View>
  );

  const footer = (
    <View className="gap-2 py-4">
      {list.hasNextPage ? (
        <View className="items-center gap-2">
          <Text className="text-[13px] text-text-secondary">{`Mostrando ${items.length} de ${total}`}</Text>
          <Button
            variant="secondary"
            label={list.isFetchingNextPage ? "Cargando…" : `Cargar ${Math.min(20, total - items.length)} más`}
            disabled={!online || list.isFetchingNextPage}
            onPress={() => void list.fetchNextPage()}
          />
        </View>
      ) : null}
      <View className="flex-row gap-2">
        <Icon name="information-outline" size={17} tone="textSecondary" />
        <Text className="flex-1 text-[13px] text-text-secondary">Toca un gasto para corregirlo o anularlo.</Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <FormHeader
        title="Gastos"
        subtitle={month.label.charAt(0).toUpperCase() + month.label.slice(1)}
        onBack={onBack}
      />
      {!list.data && list.isError ? (
        <LoadError what="los gastos" onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <View className="px-5 pt-3">
          <SkeletonRows rows={5} />
        </View>
      ) : items.length === 0 ? (
        <View className="items-center px-5 pt-10">
          <Icon name="receipt-text-outline" size={42} tone="textMuted" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Todavía no hay gastos este mes</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Anota cada compra con su boleta. Así el reporte te dice cuánto ganas de verdad.
          </Text>
          <View className="mt-5 w-full">
            <Button label="Anotar un gasto" icon={<Icon name="plus" size={18} tone="onPrimary" />} onPress={onNew} />
          </View>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseRow expense={item} now={now} onPress={() => setOpen(item)} />}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          onEndReached={() => {
            if (online && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        />
      )}
      {open ? <ExpenseSheet expense={open} onClose={() => setOpen(null)} onDone={done} /> : null}
      {message ? (
        <Toast
          message={message.text}
          actionLabel={message.onUndo ? "Deshacer" : undefined}
          onAction={
            message.onUndo
              ? () => {
                  // Se va del aviso al tocarlo: un segundo toque con la señal lenta mandaba otro deshacer
                  const run = message.onUndo;
                  setMessage(null);
                  run?.();
                }
              : undefined
          }
          onHide={hideMessage}
        />
      ) : null}
    </View>
  );
}
