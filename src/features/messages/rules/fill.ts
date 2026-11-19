import { PLACEHOLDERS, type Placeholder } from "./placeholders";

const KNOWN = new Set<string>(Object.values(PLACEHOLDERS).flat());

// Llena la plantilla. Un marcador sin valor desaparece (como la frase del adelanto cuando no hay adelanto) y los
// espacios se juntan; uno que no existe queda como está, para que se note
export function fillTemplate(body: string, context: Partial<Record<Placeholder, string>>): string {
  return body
    .replace(/\{(\w+)\}/g, (marker: string, name: string) =>
      KNOWN.has(name) ? (context[name as Placeholder] ?? "") : marker,
    )
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
}
