import { useState } from "react";
import { ScrollView, View } from "react-native";

import { MenuSection } from "@/components/ui/menu-section";
import { ScreenTitle } from "@/components/ui/screen-title";
import { businessDate } from "@/lib/dates";

import { periodRange, type Period } from "../rules/period";
import { ExportRow } from "./export-row";
import { PeriodPicker, type PeriodChoice } from "./period-picker";
import { PeriodReport } from "./period-report";

type Props = {
  onRanking: (period: { from: string; to: string; label: string }) => void;
  onIncome: () => void;
  onExpenses: () => void;
};

// Reportes (PANTALLAS.reportes), una pestaña: la semana, el mes o las fechas que elijas, comparados con el periodo
// anterior. Debajo del periodo, «Exportar a Excel»; las tarjetas de ingresos y gastos abren su lista (fase 7c)
export function ReportsScreen({ onRanking, onIncome, onExpenses }: Props) {
  const now = new Date();
  const today = businessDate(now);
  const [choice, setChoice] = useState<PeriodChoice>("week");
  const [custom, setCustom] = useState<Period | null>(null);
  const period = choice === "custom" ? custom : periodRange(choice, now);
  return (
    <View className="flex-1">
      <ScreenTitle title="Reportes" subtitle={period?.label ?? "Elige las fechas"} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-8">
        <PeriodPicker choice={choice} today={today} onChoice={setChoice} onCustom={setCustom} />
        <View className="mt-3">
          <MenuSection>
            <ExportRow />
          </MenuSection>
        </View>
        {period ? (
          <PeriodReport
            period={period}
            today={today}
            onRanking={onRanking}
            onIncome={onIncome}
            onExpenses={onExpenses}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
