import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

// Al volver a una pestaña, recarga su consulta si ya no está fresca: las pestañas no se desmontan, así que no se piden
// solas. Si está fresca (por ejemplo, recién recargada después de guardar), no hace nada: recargar en plena animación de
// volver la hacía brusca. La primera vez tampoco: ya se está cargando. useFocusEffect pide una función estable
export function useRefreshOnFocus(queryKey: QueryKey): void {
  const queryClient = useQueryClient();
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void queryClient.refetchQueries({ queryKey, type: "active", stale: true });
    }, [queryClient, queryKey]),
  );
}
