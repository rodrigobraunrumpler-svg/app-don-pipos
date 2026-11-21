import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { holdAutoLock } from "@/lib/auto-lock-hold";

import type { PickedPhoto } from "../hooks/product-draft";
import { isSmallPhoto } from "../rules/web";

type Props = {
  photo: PickedPhoto | null;
  photoUrl: string | null;
  hasPhoto: boolean;
  onPick: (photo: PickedPhoto) => void;
};

// En cuadrado, como la web: el recortador del celular se abre al elegirla
const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
};

// La foto del alfajor: «Tomar foto» o «De la galería», con el recorte. Una chica avisa que en la web se vería borrosa
// («Tomar otra» o «Usar igual»). Mientras la cámara o la galería están abiertas, el bloqueo automático espera
export function PhotoField({ photo, photoUrl, hasPhoto, onPick }: Props) {
  const [small, setSmall] = useState(false);
  const [denied, setDenied] = useState(false);
  const uri = photo?.uri ?? photoUrl;

  async function pick(source: "camera" | "library") {
    const release = holdAutoLock();
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        setDenied(!permission.granted);
        if (!permission.granted) return;
      }
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(OPTIONS);
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      setSmall(isSmallPhoto(asset.width, asset.height));
      onPick({ uri: asset.uri, width: asset.width, height: asset.height });
    } finally {
      release();
    }
  }

  return (
    <View className="gap-2.5">
      {uri ? (
        <Image accessibilityLabel="Foto del alfajor" source={{ uri }} className="aspect-square w-full rounded-lg" />
      ) : hasPhoto ? (
        <View
          accessibilityLabel="Foto del alfajor"
          className="aspect-square w-full items-center justify-center rounded-lg bg-sunken"
        >
          <Icon name="image-check-outline" size={34} tone="olive" />
          <Text className="mt-2 text-sm text-text-secondary">Foto guardada. Se sube a la web en unos segundos.</Text>
        </View>
      ) : (
        <View className="items-center gap-1.5 rounded-lg border-2 border-dashed border-border-strong bg-surface px-4 py-5">
          <Icon name="image-plus" size={30} tone="olive" />
          <Text className="text-center text-[13px] text-text-secondary">Una foto clara del alfajor, sin personas.</Text>
        </View>
      )}
      {small ? (
        <View accessibilityRole="alert" className="gap-1 rounded-md bg-warning-soft px-4 py-3">
          <Text className="font-bold text-sm text-text">
            Esta foto es chica: en la web se vería borrosa. Tómala de más cerca o con más luz.
          </Text>
          <View className="flex-row gap-2">
            <Button variant="secondary" label="Tomar otra" onPress={() => void pick("camera")} />
            <Button variant="text" label="Usar igual" onPress={() => setSmall(false)} />
          </View>
        </View>
      ) : null}
      {denied ? (
        <Text className="text-sm text-danger">Para tomar la foto, permite la cámara en los ajustes del celular.</Text>
      ) : null}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            variant="secondary"
            label="Tomar foto"
            icon={<Icon name="camera-outline" size={18} />}
            onPress={() => void pick("camera")}
          />
        </View>
        <View className="flex-1">
          <Button
            variant="secondary"
            label="De la galería"
            icon={<Icon name="image-outline" size={18} />}
            onPress={() => void pick("library")}
          />
        </View>
      </View>
    </View>
  );
}
