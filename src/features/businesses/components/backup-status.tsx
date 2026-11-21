import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatWhen } from "@/lib/dates";

import { backupStatusQuery } from "../queries/backup";

// Arriba de Ajustes (docs/spec/businesses.md): cuándo fue la última copia de seguridad, con los días de Lima. Atrasada,
// en ámbar: el monitor ya le avisó al equipo. Sin ninguna copia todavía lo dice, sin alarma: este proyecto también es el
// de producción y el plan gratis no hace copias. Cargando o con error, nada
export function BackupStatus() {
  const { data } = useQuery(backupStatusQuery);
  if (!data) return null;
  if (!data.lastBackupAt)
    return (
      <View className="flex-row gap-2.5 rounded-md border border-border bg-surface px-4 py-3">
        <Icon name="shield-outline" size={20} tone="textMuted" />
        <Text className="flex-1 text-sm text-text-secondary">Todavía no hay copias de seguridad de tus datos.</Text>
      </View>
    );
  if (data.late)
    return (
      <View accessibilityRole="alert" className="flex-row gap-2.5 rounded-md bg-warning-soft px-4 py-3">
        <Icon name="shield-alert-outline" size={20} tone="warning" />
        <View className="flex-1">
          <Text className="font-bold text-sm text-text">La copia de seguridad está atrasada.</Text>
          <Text className="text-sm text-text-secondary">El equipo ya está avisado.</Text>
        </View>
      </View>
    );
  const when = formatWhen(data.lastBackupAt, new Date());
  return (
    <View className="flex-row gap-2.5 rounded-md border border-border bg-surface px-4 py-3">
      <Icon name="shield-check-outline" size={20} tone="olive" />
      <View className="flex-1">
        <Text className="font-bold text-sm text-text">Tus datos están respaldados.</Text>
        <Text className="text-sm text-text-secondary">{`Última copia de seguridad: ${when.charAt(0).toLowerCase()}${when.slice(1)}`}</Text>
      </View>
    </View>
  );
}
