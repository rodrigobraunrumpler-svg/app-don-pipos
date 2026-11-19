import { useContext } from "react";

import { UnlockContext, type AccessState } from "./unlock-context";

// La sesión y el candado de la app, para las pantallas y para el layout raíz
export function useUnlock(): AccessState {
  const access = useContext(UnlockContext);
  if (!access) throw new Error("useUnlock necesita un UnlockProvider");
  return access;
}
