import { useState } from "react";
import { ScrollView, View } from "react-native";

import { FormHeader } from "@/components/ui/form-header";
import { businessDate } from "@/lib/dates";

import { periodRange, type Period } from "../rules/period";
import { PeriodPicker, type PeriodChoice } from "./period-picker";
import { PeriodReport } from "./period-report";

type Props = { onBack: () => void; onRanking: (period: { from: string; to: string; label: string }) => void };

// Reportes (PANTALLAS.reportes): la semana, el mes o las fechas que elijas, comparados con el periodo anterior
export function ReportsScreen({ onBack, onRanking }: Props) {
  const now = new Date();
  const today = businessDate(now);
  const [choice, setChoice] = useState<PeriodChoice>("week");
  const [custom, setCustom] = useState<Period | null>(null);
  const period = choice === "custom" ? custom : periodRange(choice, now);
  return (
    <View className="flex-1">
      <FormHeader title="Reportes" subtitle={period?.label ?? "Elige las fechas"} onBack={onBack} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-8">
        <PeriodPicker choice={choice} today={today} onChoice={setChoice} onCustom={setCustom} />
        {period ? <PeriodReport period={period} today={today} onRanking={onRanking} /> : null}
      </ScrollView>
    </View>
  );
}
