// El enlace que abre WhatsApp con el texto listo (D17): https://wa.me/<número sin +>?text=<texto codificado>
export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
