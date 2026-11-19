// Datos de ejemplo del stock para las pruebas
import type { StockItem } from "@/features/stock";

export const COQUETA_ID = "00000000-0000-4000-8000-000000000a01";
export const LIMON_ID = "00000000-0000-4000-8000-000000000a03";

export const TEST_ITEMS: StockItem[] = [
  {
    productId: COQUETA_ID,
    name: "Coqueta",
    imageUrl: null,
    linkedToWeb: true,
    minStock: 6,
    onHand: 13,
    reserved: 0,
    physical: 13,
    state: "ok",
  },
  {
    productId: LIMON_ID,
    name: "Limon Kiss",
    imageUrl: null,
    linkedToWeb: false,
    minStock: 5,
    onHand: 11,
    reserved: 0,
    physical: 11,
    state: "ok",
  },
];
