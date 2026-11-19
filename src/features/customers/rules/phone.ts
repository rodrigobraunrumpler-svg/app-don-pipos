// Un celular de Perú: +51 y 9 dígitos. Acepta espacios, guiones, puntos y paréntesis, con o sin el 51
export function normalizePhone(text: string): string | null {
  const digits = text.replace(/[\s\-.()]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 9) return `+51${digits}`;
  if (digits.length === 11 && digits.startsWith("51")) return `+${digits}`;
  return null;
}

// «987 654 321»
export function formatPhone(phone: string): string {
  const digits = phone.replace(/^\+51/, "");
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
