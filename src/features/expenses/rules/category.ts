import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "../constants";

// El ícono de un tipo de gasto: el suyo si la app lo conoce; si no, el de «otros»
export function iconFor(name: string): string {
  return CATEGORY_ICONS.some((icon) => icon.name === name) ? name : DEFAULT_CATEGORY_ICON;
}
