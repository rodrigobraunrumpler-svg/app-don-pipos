const NBSP = " "; // «S/» y el número no se separan al final de un renglón
const MINUS = "−";

// El formato se arma a mano, sin Intl, para que salga igual en todos los celulares: «S/ 1,245.50»
export function formatCents(cents: number): string {
  const absolute = Math.abs(Math.round(cents));
  const soles = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = String(absolute % 100).padStart(2, "0");
  return `${cents < 0 ? MINUS : ""}S/${NBSP}${soles}.${decimals}`;
}

// Lo que escribe el dueño: solo dígitos, con «,» o «.» como separador decimal y hasta 2 decimales.
// Devuelve céntimos, o null si no es un monto: nunca adivina otro número
export function parseSoles(text: string): number | null {
  const match = /^(\d{0,7})(?:[.,](\d{0,2}))?$/.exec(text.trim());
  if (!match) return null;
  const whole = match[1]!;
  const fraction = match[2] ?? "";
  if (whole === "" && fraction === "") return null;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
