import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { formatCents } from "@/lib/money";

type Props = { title: string; cents: number; note: string; children?: ReactNode };

// «Ingresos» o «Gastos» en Reportes: el monto, qué es y su comparación
export function KpiCard({ title, cents, note, children }: Props) {
  return (
    <View className="flex-1 rounded-md border border-border bg-surface p-3.5">
      <Text className="font-bold text-[13px] text-text-secondary">{title}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className="font-extrabold text-xl text-text">
        {formatCents(cents)}
      </Text>
      <Text className="text-xs text-text-muted">{note}</Text>
      {children}
    </View>
  );
}
