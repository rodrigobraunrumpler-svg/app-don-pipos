import type { ReactNode } from "react";

import { useSetupState, type SetupState } from "../hooks/use-setup-state";

// Para el layout raíz: dice si falta la puesta en marcha, como UnlockConsumer dice si hay sesión
export function SetupGate({ enabled, children }: { enabled: boolean; children: (setup: SetupState) => ReactNode }) {
  return children(useSetupState(enabled));
}
