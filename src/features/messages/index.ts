// Módulo messages: lo único que ven las pantallas y los otros módulos. Cada cosa se exporta por su nombre.
export { fillTemplate } from "./rules/fill";
export { PLACEHOLDERS, unknownPlaceholders } from "./rules/placeholders";
export type { Placeholder, TemplateKey } from "./rules/placeholders";
export { MessagePreview } from "./components/message-preview";
export { MessageButton } from "./components/message-button";
