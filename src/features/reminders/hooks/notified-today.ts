import AsyncStorage from "@react-native-async-storage/async-storage";

// Los avisos de «ahora» que ya salieron hoy, guardados en el celular: un alfajor avisa una sola vez por día aunque la
// app se abra diez veces. Al cambiar el día no cuentan
const KEY = "donpipos.stockNotified";

export async function readNotifiedToday(today: string): Promise<string[]> {
  try {
    const saved: unknown = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null");
    if (typeof saved !== "object" || saved === null) return [];
    const { day, ids } = saved as { day?: unknown; ids?: unknown };
    return day === today && Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function saveNotifiedToday(today: string, ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify({ day: today, ids }));
}
