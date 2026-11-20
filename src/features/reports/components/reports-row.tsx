import { MenuRow } from "@/components/ui/menu-row";
import { formatMonth } from "@/lib/dates";

import { capitalize } from "../rules/day";

// Más → Tu negocio: «Reportes», con el mes en curso
export function ReportsRow({ onPress }: { onPress: () => void }) {
  return <MenuRow icon="chart-bar" label="Reportes" value={capitalize(formatMonth(new Date()))} onPress={onPress} />;
}
