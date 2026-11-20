import { useQuery } from "@tanstack/react-query";
import { Linking, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { SkeletonRows } from "@/components/ui/skeleton";
import { SwitchRow } from "@/components/ui/switch-row";
import { businessQuery, useSaveSettings } from "@/features/businesses";
import { useOnline } from "@/lib/use-online";

import { REMINDER_ROWS } from "../constants";
import { useNotificationPermission } from "../hooks/use-notification-permission";

// Más → Recordatorios (la hoja de la maqueta): tres interruptores. Si el celular no dio permiso de avisos, lo dice: si
// nunca se pidió, lo pide; si lo negó, abre los ajustes del sistema
export function RemindersSheet({ onClose }: { onClose: () => void }) {
  const online = useOnline();
  const reminders = useQuery(businessQuery).data?.settings.reminders;
  const { save, failure } = useSaveSettings();
  const permission = useNotificationPermission();

  return (
    <Sheet visible title="Recordatorios" onClose={onClose}>
      <Text className="text-sm text-text-secondary">Avisos del propio celular, aunque la app esté cerrada.</Text>
      {permission.status && permission.status !== "granted" ? (
        <View className="mt-3 gap-2.5 rounded-md bg-sunken px-4 py-3">
          <Text className="text-sm text-text">El celular no deja que Don Pipos te mande avisos.</Text>
          <Button
            variant="secondary"
            label={permission.status === "undetermined" ? "Permitir avisos" : "Abrir ajustes del celular"}
            onPress={() => void (permission.status === "undetermined" ? permission.ask() : Linking.openSettings())}
          />
        </View>
      ) : null}
      {online ? null : <Notice>Sin conexión. Los cambios esperan a que vuelva la señal.</Notice>}
      {reminders ? (
        <View className="mt-2">
          {REMINDER_ROWS.map((row) => (
            <SwitchRow
              key={row.kind}
              label={row.title}
              description={row.description}
              value={reminders[row.kind]}
              disabled={!online}
              onChange={(value) => void save({ reminders: { ...reminders, [row.kind]: value } })}
            />
          ))}
        </View>
      ) : (
        <SkeletonRows rows={3} />
      )}
      {failure ? <Text className="pb-2 pt-2 font-bold text-sm text-danger">{failure}</Text> : null}
    </Sheet>
  );
}
