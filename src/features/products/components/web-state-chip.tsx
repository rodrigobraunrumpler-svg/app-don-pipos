import { Text, View } from "react-native";

import { Icon, type IconName } from "@/components/ui/icon";

import type { WebState } from "../schema/product";

type Tone = "olive" | "textMuted" | "caramelText" | "danger" | "warning";
const STATES: Record<WebState, [string, IconName, Tone] | null> = {
  none: null,
  incomplete: ["Le falta foto o descripción", "image-off-outline", "warning"],
  waiting: ["Todavía no está en la web", "clock-outline", "textMuted"],
  pending: ["Subiendo a la web…", "cloud-upload-outline", "caramelText"],
  failing: ["No se pudo subir", "alert-circle-outline", "danger"],
  sent: ["En la web", "link-variant", "olive"],
  hidden: ["Oculto", "eye-off-outline", "textMuted"],
};
const TEXT: Record<Tone, string> = {
  olive: "text-olive",
  textMuted: "text-text-muted",
  caramelText: "text-caramel-text",
  danger: "text-danger",
  warning: "text-warning",
};

// Cómo va un alfajor en la web, en su fila: «Subiendo a la web…», «En la web», «Oculto»… La foto que todavía no se
// subió (sin señal) se dice antes que todo. «Nuevo» al lado, los primeros 30 días
export function WebStateChip({
  state,
  isNew,
  photoWaiting,
}: {
  state: WebState;
  isNew: boolean;
  photoWaiting: boolean;
}) {
  const shown = photoWaiting ? (["La foto espera la señal", "wifi-off", "warning"] as const) : STATES[state];
  return (
    <View className="mt-1 flex-row flex-wrap items-center gap-2">
      {shown ? (
        <View className="flex-row items-center gap-1">
          <Icon name={shown[1]} size={15} tone={shown[2]} />
          <Text className={`font-bold text-[13px] ${TEXT[shown[2]]}`}>{shown[0]}</Text>
        </View>
      ) : null}
      {isNew ? (
        <Text className="overflow-hidden rounded-full bg-caramel px-2 py-0.5 font-extrabold text-[11px] text-text">
          Nuevo
        </Text>
      ) : null}
    </View>
  );
}
