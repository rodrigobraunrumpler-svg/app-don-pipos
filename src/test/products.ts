// Los alfajores de ejemplo para las pruebas, los mismos de src/test/stock-items.ts, con su precio
import type { Product } from "@/features/products";

import { COQUETA_ID, LIMON_ID } from "./stock-items";

const base = {
  costCents: null,
  minStock: 6,
  showOnWeb: true,
  isActive: true,
  imageUrl: null,
  linkedToWeb: false,
  description: null,
  allergens: [],
  hasPhoto: false,
  webSlug: null,
  isNew: false,
  webState: "none" as const,
  version: 1,
};

export const TEST_PRODUCTS: Product[] = [
  { ...base, id: COQUETA_ID, name: "Coqueta", priceCents: 1200, sortOrder: 1 },
  { ...base, id: LIMON_ID, name: "Limon Kiss", priceCents: 1200, sortOrder: 2 },
];
