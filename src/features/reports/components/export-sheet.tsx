import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/errors";
import { useOnline } from "@/lib/use-online";

import { useExportFile } from "../hooks/use-export-file";
import { lastMonthRange, periodRange } from "../rules/period";

type Range = { from: string; to: string; label: string };
type Props = { initial?: Range; onClose: () => void };

// Exportar a Excel: esta semana, este mes, el mes pasado o las fechas que traía Reportes (ya elegidas). «Compartir
// archivo» arma el CSV y abre «Compartir» del celular. Sin señal no se puede
export function ExportSheet({ initial, onClose }: Props) {
  const online = useOnline();
  const exportFile = useExportFile();
  const now = new Date();
  const fixed: Range[] = [
    { ...periodRange("week", now), label: "Esta semana" },
    { ...periodRange("month", now), label: "Este mes" },
    { ...lastMonthRange(now), label: "El mes pasado" },
  ];
  const same = initial && fixed.find((range) => range.from === initial.from && range.to === initial.to);
  const options = initial && !same ? [initial, ...fixed] : fixed;
  const [chosen, setChosen] = useState(same?.label ?? initial?.label ?? "Este mes");
  const [message, setMessage] = useState<string | null>(null);

  async function share() {
    const range = options.find((option) => option.label === chosen) ?? options[0]!;
    setMessage(null);
    try {
      const rows = await exportFile.mutateAsync({ from: range.from, to: range.to });
      if (rows === 0) setMessage("No hay pedidos, pagos, gastos ni ingresos en ese periodo.");
      else onClose();
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <Sheet visible title="Exportar a Excel" onClose={onClose}>
      <Text className="text-sm text-text-secondary">
        Un archivo con los pedidos, pagos, devoluciones, gastos e ingresos, para abrir en Excel o en Hojas de cálculo.
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Periodo" className="mt-3 gap-2">
        {options.map((option) => {
          const checked = option.label === chosen;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => setChosen(option.label)}
              className={`min-h-[50px] flex-row items-center gap-3 rounded-sm border-[1.5px] px-4 ${checked ? "border-primary bg-surface" : "border-border bg-surface"}`}
            >
              <Icon
                name={checked ? "radiobox-marked" : "radiobox-blank"}
                size={20}
                tone={checked ? "primary" : "textMuted"}
              />
              <Text className="font-bold text-base text-text">{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-4 gap-2 pb-2">
        {message ? <Text className="font-bold text-sm text-text">{message}</Text> : null}
        <Button
          label={exportFile.isPending ? "Preparando el archivo…" : "Compartir archivo"}
          icon={<Icon name="share-variant" size={18} tone={online ? "onPrimary" : "textMuted"} />}
          disabled={!online || exportFile.isPending}
          onPress={() => void share()}
        />
      </View>
    </Sheet>
  );
}
