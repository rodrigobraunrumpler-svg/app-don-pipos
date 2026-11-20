import type { ReactNode } from "react";

import { SetupDraftContext, useSetupDraftState } from "../hooks/use-setup-draft";

// Comparte lo puesto entre los tres pasos de la puesta en marcha
export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const draft = useSetupDraftState();
  return <SetupDraftContext.Provider value={draft}>{children}</SetupDraftContext.Provider>;
}
