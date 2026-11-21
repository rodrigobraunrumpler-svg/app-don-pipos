// Los marcadores que vale cada plantilla (docs/spec/messages.md §2), con el mismo criterio que la base
export const PLACEHOLDERS = {
  confirmation: ["nombre", "numero", "detalle", "total", "adelanto", "entrega"],
  on_the_way: ["nombre", "numero", "pago", "falta"],
  ready: ["nombre", "numero", "pago", "falta"],
  delivered: ["nombre", "sellos"],
  balance_reminder: ["nombre", "numero", "falta"],
  we_miss_you: ["nombre"],
  // Fase 9: el enlace es el de reseñas de Google del negocio (Ajustes)
  ask_review: ["nombre", "enlace"],
} as const;

export type TemplateKey = keyof typeof PLACEHOLDERS;
export type Placeholder = (typeof PLACEHOLDERS)[TemplateKey][number];

// Los marcadores del texto que esa plantilla no vale
export function unknownPlaceholders(key: TemplateKey, body: string): string[] {
  const allowed: readonly string[] = PLACEHOLDERS[key];
  return [...body.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).filter((name) => !allowed.includes(name));
}
