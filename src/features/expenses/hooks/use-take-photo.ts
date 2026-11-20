import * as ImagePicker from "expo-image-picker";
import { useState } from "react";

export type Photo = { uri: string; width: number; height: number };

// Toma la foto de una boleta con la cámara (sin galería). Pide el permiso la primera vez; si no lo dan, lo dice
export function useTakePhoto(): { take: () => Promise<Photo | null>; denied: boolean } {
  const [denied, setDenied] = useState(false);
  async function take() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    setDenied(!permission.granted);
    if (!permission.granted) return null;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
    const asset = result.canceled ? undefined : result.assets[0];
    return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
  }
  return { take, denied };
}
