import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { formatCents } from "@/lib/money";

type Props = { title: string; cents: number; note: string; onPress: () => void; children?: ReactNode };

// «Ingresos» o «Gastos» en Reportes: el monto, qué es y su comparación. Tocarla abre su lista. Sin etiqueta propia:
// el lector de pantalla lee todo lo que muestra
export function KpiCard({ title, cents, note, onPress, children }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-1 rounded-md border border-border bg-surface p-3.5"
    >
      <Text className="font-bold text-[13px] text-text-secondary">{title}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className="font-extrabold text-xl text-text">
        {formatCents(cents)}
      </Text>
      <Text className="text-xs text-text-muted">{note}</Text>
      {children}
      <Text className="mt-1.5 font-extrabold text-xs text-primary">Ver la lista ›</Text>
    </Pressable>
  );
}
