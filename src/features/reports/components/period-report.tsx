import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Notice } from "@/components/ui/notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useOnline } from "@/lib/use-online";

import { reportSummaryQuery } from "../queries/reports";
import { barUnit } from "../rules/bars";
import { loadedWhen } from "../rules/loaded";
import type { Period } from "../rules/period";
import { ByMethod } from "./by-method";
import { ExportSheet } from "./export-sheet";
import { InOutChart } from "./in-out-chart";
import { ReportKpis } from "./report-kpis";

type Props = {
  period: Period;
  today: string;
  onRanking: (period: { from: string; to: string; label: string }) => void;
  onIncome: () => void;
  onExpenses: () => void;
};

// Los números de un periodo: la ganancia con ingresos y gastos, «Entra y sale», por medio de pago, «Ver alfajores» y
// «Exportar» (con las fechas del periodo ya elegidas)
export function PeriodReport({ period, today, onRanking, onIncome, onExpenses }: Props) {
  const online = useOnline();
  // Al cambiar de periodo no parpadea: los números de antes quedan, atenuados, hasta que llegan los nuevos (§14.2)
  const { data, isError, refetch, dataUpdatedAt, isPlaceholderData } = useQuery({
    ...reportSummaryQuery(period),
    placeholderData: keepPreviousData,
  });
  const [exporting, setExporting] = useState(false);
  if (!data && isError) return <LoadError what="los reportes" onRetry={() => void refetch()} />;
  if (!data)
    return (
      <View className="mt-4">
        <SkeletonRows rows={4} />
      </View>
    );
  // «Todavía no hay datos» solo si tampoco hubo nada antes: un lunes temprano se ve en cero, con su comparación
  const { previous } = data;
  const empty =
    !data.incomeCents &&
    !data.expensesCents &&
    !previous.incomeCents &&
    !previous.expensesCents &&
    data.bars.every((bar) => !bar.incomeCents && !bar.expensesCents);
  return (
    <>
      {online ? null : (
        <Notice>{`Sin conexión. Ves los números cargados ${loadedWhen(new Date(dataUpdatedAt), new Date())}.`}</Notice>
      )}
      {empty ? (
        <View className="items-center pt-10">
          <Icon name="chart-bar" size={42} tone="textMuted" />
          <Text className="mt-4 text-center font-extrabold text-xl text-text">Todavía no hay datos</Text>
          <Text className="mt-1.5 text-center text-base text-text-secondary">
            Cuando anotes pedidos y gastos, aquí verás cuánto entra, cuánto sale y cuánto ganas.
          </Text>
        </View>
      ) : (
        <View className={isPlaceholderData ? "opacity-50" : ""}>
          <ReportKpis summary={data} against={period.previousLabel} onIncome={onIncome} onExpenses={onExpenses} />
          {/* Con otro periodo, el gráfico vuelve a mostrar su última barra */}
          <InOutChart
            key={`${period.from}:${period.to}`}
            bars={data.bars}
            unit={barUnit(period.from, period.to)}
            today={today}
          />
          <ByMethod byMethod={data.byMethod} />
          <View className="mt-6 gap-2.5">
            <Button
              variant="secondary"
              label="Ver alfajores"
              icon={<Icon name="cookie-outline" size={18} />}
              onPress={() => onRanking({ from: period.from, to: period.to, label: period.label })}
            />
            <Button
              variant="secondary"
              label="Exportar"
              icon={<Icon name="download" size={18} />}
              onPress={() => setExporting(true)}
            />
          </View>
          {exporting ? <ExportSheet initial={period} onClose={() => setExporting(false)} /> : null}
        </View>
      )}
    </>
  );
}
