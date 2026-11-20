import { useInfiniteQuery } from "@tanstack/react-query";

import { MenuRow } from "@/components/ui/menu-row";

import { customersQuery } from "../queries/customers";

// Más → Tu negocio: «Clientes», con cuántos hay
export function CustomersRow({ onPress }: { onPress: () => void }) {
  const total = useInfiniteQuery(customersQuery("all", "")).data?.pages[0]?.meta.total;
  return (
    <MenuRow
      icon="account-group-outline"
      label="Clientes"
      value={total === undefined ? null : String(total)}
      onPress={onPress}
    />
  );
}
