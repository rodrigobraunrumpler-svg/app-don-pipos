import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { getSessionState, onSessionChange } from "../api/session";
import { authKeys } from "./keys";

// La sesión vive en el almacenamiento cifrado de Supabase: nunca en la caché guardada del celular.
// Se lee del celular, no de la red: también sin señal («always»; si no, quedaría en espera)
export const sessionQuery = queryOptions({
  queryKey: [...authKeys.all, "session"] as const,
  queryFn: getSessionState,
  staleTime: Infinity,
  gcTime: Infinity,
  networkMode: "always",
  meta: { persist: false },
});

// Con cada cambio de sesión, la vuelve a leer del celular. Devuelve cómo dejar de escuchar
export function followSessionChanges(queryClient: QueryClient): () => void {
  return onSessionChange(() => void queryClient.refetchQueries({ queryKey: sessionQuery.queryKey }));
}
