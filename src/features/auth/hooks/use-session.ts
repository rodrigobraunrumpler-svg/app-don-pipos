import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { followSessionChanges, sessionQuery } from "../queries/session";
import type { SessionStatus } from "./use-unlock-state";

// ¿Hay sesión en este celular? Sigue cada cambio: ingresar, renovarse, cerrarse o vencer
export function useSession(): { status: SessionStatus } {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(sessionQuery);
  useEffect(() => followSessionChanges(queryClient), [queryClient]);
  if (isPending) return { status: "loading" };
  // Si no se pudo leer, se pide ingresar: al ingresar se guarda una sesión nueva
  return { status: data ?? "signed-out" };
}
