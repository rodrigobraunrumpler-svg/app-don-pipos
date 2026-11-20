import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { useTakePhoto, type Photo } from "../hooks/use-take-photo";

type Props = { photo: Photo | null; onChange: (photo: Photo | null) => void };

// «Boleta» (la maqueta): «Tomar foto de la boleta» con la cámara, o la foto tomada con «Quitar». Sube después de
// guardar el gasto
export function ReceiptPicker({ photo, onChange }: Props) {
  const { take, denied } = useTakePhoto();

  if (photo)
    return (
      <View className="flex-row items-center gap-3 rounded-md border border-border bg-surface p-2.5">
        <View className="h-14 w-14 overflow-hidden rounded-sm bg-sunken">
          <Image source={{ uri: photo.uri }} style={{ width: 56, height: 56 }} contentFit="cover" accessible={false} />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-base text-text">Foto de la boleta</Text>
          <Text className="text-[13px] text-text-secondary">Se guarda junto al gasto</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitar la foto"
          onPress={() => onChange(null)}
          hitSlop={8}
        >
          <Text className="font-bold text-sm text-accent">Quitar</Text>
        </Pressable>
      </View>
    );

  return (
    <View className="gap-1.5">
      <Button
        variant="secondary"
        label="Tomar foto de la boleta"
        icon={<Icon name="camera-outline" size={18} />}
        onPress={() => void take().then((taken) => taken && onChange(taken))}
      />
      {denied ? (
        <Text className="text-sm text-text-secondary">
          Para la foto, da permiso a la cámara en los ajustes del celular.
        </Text>
      ) : null}
    </View>
  );
}
