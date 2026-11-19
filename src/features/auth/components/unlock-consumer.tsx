import type { ReactNode } from "react";

import type { AccessState } from "../hooks/unlock-context";
import { useUnlock } from "../hooks/use-unlock";

// Entrega la sesión y el candado a quien arma la navegación (el layout raíz), dentro del UnlockProvider
export function UnlockConsumer({ children }: { children: (access: AccessState) => ReactNode }) {
  return children(useUnlock());
}
