import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { reportsKeys } from "../queries/keys";

// Inicio y Reportes leen pedidos, pagos, gastos, ingresos y el cuadre, pero esos módulos no conocen a reports (sería un
// círculo). Por eso, después de cualquier guardado que refresca algo (meta.invalidates), también se piden de nuevo, aunque
// la respuesta se haya perdido: al volver a Inicio ya está al día. Exportar no guarda nada y no cuenta
export function useRefreshAfterWrites(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      queryClient.getMutationCache().subscribe((event) => {
        if (event.type !== "updated" || !event.mutation.meta?.invalidates?.length) return;
        if (event.action.type === "success" || event.action.type === "error")
          void queryClient.invalidateQueries({ queryKey: reportsKeys.all });
      }),
    [queryClient],
  );
}
