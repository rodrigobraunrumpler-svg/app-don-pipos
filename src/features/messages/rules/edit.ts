import { unknownPlaceholders, type TemplateKey } from "./placeholders";

const MAX_LENGTH = 500;

// Inserta «{marcador}» donde está el cursor (o en lugar de lo elegido) y dice dónde queda el cursor
export function insertPlaceholder(
  body: string,
  selection: { start: number; end: number },
  name: string,
): { body: string; cursor: number } {
  const marker = `{${name}}`;
  return {
    body: body.slice(0, selection.start) + marker + body.slice(selection.end),
    cursor: selection.start + marker.length,
  };
}

// Lo que impide guardar un mensaje, con el mismo criterio que update_template; null si se puede
export function templateProblem(key: TemplateKey, body: string): string | null {
  const text = body.trim();
  if (!text) return "El mensaje no puede quedar vacío.";
  if (text.length > MAX_LENGTH) return `El mensaje va hasta ${MAX_LENGTH} letras.`;
  const unknown = [...new Set(unknownPlaceholders(key, text))].map((name) => `«{${name}}»`);
  if (unknown.length === 1) return `${unknown[0]} no se puede usar en este mensaje.`;
  if (unknown.length > 1)
    return `${unknown.slice(0, -1).join(", ")} y ${unknown.at(-1)} no se pueden usar en este mensaje.`;
  return null;
}
