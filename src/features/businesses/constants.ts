// Los tipos de gasto que propone el paso 3 de la puesta en marcha (los de la maqueta), con los íconos de expenses.
// Son sugerencias de pantalla: nada se crea sin «Terminar»
export const SETUP_EXPENSE_CATEGORIES = [
  { name: "Insumos", icon: "basket-outline", chosen: true },
  { name: "Empaques", icon: "package-variant-closed", chosen: true },
  { name: "Delivery", icon: "moped", chosen: true },
  { name: "Servicios", icon: "fire", chosen: true },
  { name: "Otros", icon: "receipt-text-outline", chosen: false },
] as const;
