import { Image, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatCents } from "@/lib/money";

import { webName } from "../rules/web";

type Props = { name: string; description: string; priceCents: number | null; photoUri: string | null; isNew: boolean };

// La tarjeta del alfajor como saldrá en la web (con los colores de la web; la letra, la de la app)
export function WebPreviewCard({ name, description, priceCents, photoUri, isNew }: Props) {
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-surface">
      <View className="flex-row items-center gap-1.5 border-b border-border px-3 py-2">
        <Icon name="lock-outline" size={13} tone="textMuted" />
        <Text className="text-xs text-text-muted">varmar.pe › don-pipos</Text>
      </View>
      {photoUri ? (
        <Image accessibilityLabel="Foto del alfajor" source={{ uri: photoUri }} className="aspect-square w-full" />
      ) : null}
      <View className="gap-2 px-4 pb-4 pt-3.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-bold text-xs text-olive">Don Pipos · Alfajor artesanal</Text>
          {isNew ? (
            <Text className="overflow-hidden rounded-full bg-caramel px-2 py-0.5 font-extrabold text-[11px] text-text">
              Nuevo
            </Text>
          ) : null}
        </View>
        <Text className="font-extrabold text-2xl text-text">{webName(name.trim() || "…")}</Text>
        {description.trim() ? (
          <Text className="text-sm leading-5 text-text-secondary">{description.trim()}</Text>
        ) : null}
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-extrabold text-lg text-text">
            {priceCents === null ? "S/ …" : formatCents(priceCents)}
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full bg-primary px-3.5 py-2">
            <Icon name="whatsapp" size={16} tone="onPrimary" />
            <Text className="font-bold text-[13px] text-on-primary">Pedir</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
