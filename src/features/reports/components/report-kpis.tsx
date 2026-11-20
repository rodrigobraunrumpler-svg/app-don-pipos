import { Text, View } from "react-native";

import { formatCents } from "@/lib/money";

import type { ReportSummary } from "../schema/report";
import { DeltaChip } from "./delta-chip";
import { KpiCard } from "./kpi-card";

// La ganancia (ingresos menos gastos) grande, y debajo ingresos y gastos, cada uno con su comparación
export function ReportKpis({ summary, against }: { summary: ReportSummary; against: string }) {
  const { previous } = summary;
  return (
    <View className="mt-4 gap-2.5">
      <View className="rounded-md bg-brand p-4">
        <Text className="font-bold text-[13px] text-on-primary opacity-80">Ganancia</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          className="font-extrabold text-[35px] leading-[40px] text-on-primary"
        >
          {formatCents(summary.profitCents)}
        </Text>
        <Text className="text-xs text-on-primary opacity-80">Ingresos menos gastos</Text>
        <DeltaChip current={summary.profitCents} previous={previous.profitCents} upIsGood against={against} onBrand />
      </View>
      <View className="flex-row gap-2.5">
        <KpiCard title="Ingresos" cents={summary.incomeCents} note="Pagos recibidos">
          <DeltaChip current={summary.incomeCents} previous={previous.incomeCents} upIsGood against={against} />
        </KpiCard>
        <KpiCard title="Gastos" cents={summary.expensesCents} note="Lo anotado">
          <DeltaChip
            current={summary.expensesCents}
            previous={previous.expensesCents}
            upIsGood={false}
            against={against}
          />
        </KpiCard>
      </View>
    </View>
  );
}
