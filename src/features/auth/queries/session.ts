import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { getSession, onSessionChange } from "../api/session";
import { authKeys } from "./keys";

// La sesión vive en el almacenamiento cifrado de Supabase: nunca en la caché guardada del celular
export const sessionQuery = queryOptions({
  queryKey: [...authKeys.all, "session"] as const,
  queryFn: getSession,
  staleTime: Infinity,
  gcTime: Infinity,
  meta: { persist: false },
});

// Pone en la caché cada cambio de sesión. Devuelve cómo dejar de escuchar
export function followSessionChanges(queryClient: QueryClient): () => void {
  return onSessionChange((session) => queryClient.setQueryData(sessionQuery.queryKey, session));
}
