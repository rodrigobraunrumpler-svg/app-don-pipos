import type { ReactNode } from "react";

import { DraftContext } from "../hooks/draft-context";
import { useOrderDraft } from "../hooks/use-order-draft";

// Comparte el borrador entre las pantallas de Nuevo pedido: lo que se elige en el paso 1 sigue ahí al volver del 2
export function OrderDraftProvider({ children }: { children: ReactNode }) {
  const draft = useOrderDraft();
  return <DraftContext.Provider value={draft}>{children}</DraftContext.Provider>;
}
