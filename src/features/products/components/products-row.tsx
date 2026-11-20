import { useQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";

import { productsQuery } from "../queries/products";

// Más → Ajustes: la fila «Productos y precios», con cuántos alfajores hay
export function ProductsRow({ onPress }: { onPress: () => void }) {
  const count = useQuery(productsQuery).data?.length;
  return (
    <MenuRow
      icon="cookie"
      label="Productos y precios"
      value={count === undefined ? null : `${count} ${count === 1 ? "alfajor" : "alfajores"}`}
      onPress={onPress}
    />
  );
}
