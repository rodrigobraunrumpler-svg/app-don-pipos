import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_SIDE = 1600;

// La foto de una boleta, achicada antes de subir (docs/spec/README.md): el lado mayor en 1600 px y JPEG 0,7, que suele
// pesar menos de 300 KB. Una foto más chica no se agranda. Devuelve el JPEG como texto base64
export async function shrinkPhoto(photo: { uri: string; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > MAX_SIDE)
    context.resize(photo.width >= photo.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return saved.base64 ?? "";
}
