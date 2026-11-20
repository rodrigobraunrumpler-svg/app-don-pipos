import { Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";
import type { ColorName } from "@/theme";

import { useUrgentRows } from "../hooks/use-urgent-rows";
import type { UrgentKind, UrgentRow } from "../rules/urgent";

// La maqueta: el reloj para lo que va tarde y lo que se acaba, el triángulo para el stock; rojo lo que no espera
const ICONS: Record<UrgentKind, IconName> = {
  late: "clock-outline",
  out: "alert-outline",
  owed: "alert-outline",
  check: "alert-outline",
  low: "clock-outline",
};
const TONES: Record<UrgentKind, ColorName> = {
  late: "danger",
  out: "danger",
  owed: "danger",
  check: "warning",
  low: "warning",
};

type Props = {
  now: Date;
  onOpenOrder: (orderId: string) => void;
  onProduct: (productId: string) => void;
  onProduction: () => void;
};

// Lo urgente, arriba de Inicio: cada fila lleva a su pedido, a revisar el alfajor o a Registrar producción
export function HomeUrgent({ now, onOpenOrder, onProduct, onProduction }: Props) {
  const rows = useUrgentRows(now);
  if (rows.length === 0) return null;

  function open(row: UrgentRow) {
    if (row.kind === "late") onOpenOrder(row.id);
    else if (row.kind === "check") onProduct(row.id);
    else onProduction();
  }

  return (
    <View testID="urgent" className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
      {rows.map((row, index) => (
        <Pressable
          key={`${row.kind}-${row.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${row.title}. ${row.detail}`}
          onPress={() => open(row)}
          className={`min-h-14 flex-row items-center gap-3 px-3.5 py-2.5 ${index > 0 ? "border-t border-border" : ""}`}
        >
          <Icon name={ICONS[row.kind]} size={20} tone={TONES[row.kind]} />
          <View className="flex-1">
            <Text className="font-extrabold text-[14.5px] text-text">{row.title}</Text>
            <Text className="text-[13px] text-text-secondary">{row.detail}</Text>
          </View>
          <Icon name="chevron-right" size={20} tone="textMuted" />
        </Pressable>
      ))}
    </View>
  );
}
