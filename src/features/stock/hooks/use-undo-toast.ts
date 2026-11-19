import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { errorMessage } from "@/lib/errors";

import { revertStockChangeMutation } from "../queries/mutations";
import type { StockChangeDone } from "../schema/stock";

export type UndoToastState = { message: string; undoId: string | null };

// El aviso de después de guardar una merma o un conteo, con «Deshacer»: la base deshace el registro entero
export function useUndoToast() {
  const revert = useMutation(revertStockChangeMutation);
  const [toast, setToast] = useState<UndoToastState | null>(null);

  async function undo(requestId: string) {
    setToast(null);
    try {
      await revert.mutateAsync(requestId);
      setToast({ message: "Listo, se deshizo.", undoId: null });
    } catch (error) {
      setToast({ message: errorMessage(error), undoId: null });
    }
  }

  return {
    toast,
    show: ({ requestId, message }: StockChangeDone) => setToast({ message, undoId: requestId }),
    hide: () => setToast(null),
    undo,
  };
}
