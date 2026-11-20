import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "../queries/business";

export type SetupState = "loading" | "needed" | "done";

// Si falta la puesta en marcha. Mientras lo pide por primera vez, «loading»; si no se puede saber (error, sin señal,
// sin sesión), «done»: la app entra a Inicio y nunca se queda bloqueada (decidido en la fase 7b)
export function useSetupState(enabled: boolean): SetupState {
  const { data, fetchStatus } = useQuery({ ...businessQuery, enabled });
  if (data) return data.setupDone ? "done" : "needed";
  return enabled && fetchStatus === "fetching" ? "loading" : "done";
}
