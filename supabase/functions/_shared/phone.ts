// El número del dueño en el formato de la base: +51 y 9 números. Acepta espacios, guiones y el +51 o 51 delante
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/^\+?51(?=\d{9}$)/, "");
  return /^\d{9}$/.test(digits) ? `+51${digits}` : null;
}
