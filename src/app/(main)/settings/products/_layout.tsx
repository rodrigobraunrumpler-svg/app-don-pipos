import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { businessQuery } from "@/features/businesses";
import { ProductDraftProvider } from "@/features/products";

// Productos y precios (fase 9): la lista, Nuevo, Editar, Vista previa y Ordenar comparten el borrador del alfajor y se
// deslizan una sobre otra; la flecha vuelve de a una. El negocio va al borrador: la foto se sube a su carpeta
export default function ProductsLayout() {
  const business = useQuery(businessQuery).data;
  return (
    <ProductDraftProvider businessId={business?.id ?? null}>
      <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }} />
    </ProductDraftProvider>
  );
}
