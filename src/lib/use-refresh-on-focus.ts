import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

// Al volver a una pestaña, recarga su consulta: las pestañas no se desmontan, así que no se piden solas.
// La primera vez no: la consulta ya se está cargando. useFocusEffect pide una función estable (useCallback)
export function useRefreshOnFocus(queryKey: QueryKey): void {
  const queryClient = useQueryClient();
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void queryClient.invalidateQueries({ queryKey });
    }, [queryClient, queryKey]),
  );
}
