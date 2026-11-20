import { createContext, useContext } from "react";

import type { useOrderDraft } from "./use-order-draft";

export type DraftContextValue = ReturnType<typeof useOrderDraft>;

export const DraftContext = createContext<DraftContextValue | null>(null);

// El borrador del pedido que se está anotando, el mismo en el paso 1 y en el 2 (OrderDraftProvider)
export function useDraft(): DraftContextValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useDraft necesita un OrderDraftProvider");
  return value;
}
