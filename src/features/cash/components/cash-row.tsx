import { useQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";
import { businessDate } from "@/lib/dates";

import { latestCashCountQuery } from "../queries/cash";

// Más → Tu negocio: «Cuadre de caja», con «Hoy» mientras no se cierra y «Cerrado» después
export function CashRow({ onPress }: { onPress: () => void }) {
  const latest = useQuery(latestCashCountQuery(businessDate(new Date())));
  const value = latest.data === undefined ? null : latest.data ? "Cerrado" : "Hoy";
  return <MenuRow icon="calculator-variant-outline" label="Cuadre de caja" value={value} onPress={onPress} />;
}
