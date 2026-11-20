// Los íconos que se eligen para un tipo de gasto, con cómo los nombra el lector de pantalla. «Otros» es el de siempre:
// la app lo dibuja si la base trae uno que no conoce
export const CATEGORY_ICONS = [
  { name: "basket-outline", label: "insumos" },
  { name: "package-variant-closed", label: "empaques" },
  { name: "moped", label: "delivery" },
  { name: "fire", label: "gas y servicios" },
  { name: "storefront-outline", label: "local" },
  { name: "tools", label: "equipos" },
  { name: "bullhorn-outline", label: "publicidad" },
  { name: "receipt-text-outline", label: "otros" },
] as const;

export const DEFAULT_CATEGORY_ICON = "receipt-text-outline";
