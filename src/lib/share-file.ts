import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";

// Guarda el archivo para Excel en la caché del celular y abre «Compartir» con él (WhatsApp, Drive, correo…)
export async function shareCsv(name: string, text: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(text);
  await shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text", dialogTitle: name });
}
