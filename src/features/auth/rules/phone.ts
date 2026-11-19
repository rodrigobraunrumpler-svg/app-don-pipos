// El número tal como se ve: +51 900 000 901
export function formatPhone(phone: string): string {
  const match = /^\+51(\d{3})(\d{3})(\d{3})$/.exec(phone);
  return match ? `+51 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

// De lo que escribe el dueño quedan las 9 cifras del celular, sin el 51 delante
export function phoneDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  return (digits.length === 11 && digits.startsWith("51") ? digits.slice(2) : digits).slice(0, 9);
}
