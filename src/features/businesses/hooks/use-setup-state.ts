import { useQuery } from "@tanstack/react-query";

import { businessQuery } from "../queries/business";

export type SetupState = "loading" | "needed" | "done";

// Si falta la puesta en marcha. Mientras lo pide por primera vez, «loading»; si no se puede saber (falló una vez, sin
// señal, sin sesión), «done»: la app entra a Inicio y nunca se queda bloqueada, ni esperando los reintentos (fase 7b)
export function useSetupState(enabled: boolean): SetupState {
  const { data, fetchStatus, failureCount } = useQuery({ ...businessQuery, enabled });
  if (data) return data.setupDone ? "done" : "needed";
  return enabled && fetchStatus === "fetching" && failureCount === 0 ? "loading" : "done";
}
