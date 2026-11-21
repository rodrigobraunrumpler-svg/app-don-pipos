// Lo de la web de cada alfajor, sin pantallas (fase 9): su nombre allá, qué le falta para salir, si la foto es chica y
// la dirección de su página para compartirla

// Los mismos 13 de la web (src/sanity/lib/validation.ts en el proyecto de la web), con sus nombres
export const ALLERGENS = [
  ["gluten", "Gluten"],
  ["lacteos", "Lácteos"],
  ["huevo", "Huevo"],
  ["pescado", "Pescado"],
  ["crustaceos", "Crustáceos"],
  ["moluscos", "Moluscos"],
  ["mani", "Maní"],
  ["frutos-secos", "Frutos secos"],
  ["soya", "Soya"],
  ["ajonjoli", "Ajonjolí"],
  ["mostaza", "Mostaza"],
  ["apio", "Apio"],
  ["sulfitos", "Sulfitos"],
] as const;

export const DESCRIPTION_MAX = 400;
// La web muestra la foto grande: con el lado menor por debajo de esto se vería borrosa
const MIN_PHOTO_SIDE = 1080;

export const webName = (name: string): string => (/^alfajor\s/i.test(name) ? name : `Alfajor ${name}`);

// Para prender «Se ve en la web», uno que todavía no está allá necesita foto y descripción. Los que ya están (enlazados)
// tienen las suyas en el panel
export function missingForWeb(product: { linked: boolean; hasPhoto: boolean; description: string }): string | null {
  if (product.linked) return null;
  const description = product.description.trim() !== "";
  if (!product.hasPhoto && !description) return "Falta la foto y la descripción";
  if (!product.hasPhoto) return "Falta la foto";
  return description ? null : "Falta la descripción";
}

export const isSmallPhoto = (width: number, height: number): boolean => Math.min(width, height) < MIN_PHOTO_SIDE;

export const pageUrl = (base: string | undefined, slug: string | null): string | null =>
  base && slug ? `${base}/don-pipos/${slug}` : null;

export const shareText = (name: string, url: string): string => `Nuevo en Don Pipos: ${webName(name)} ${url}`;
