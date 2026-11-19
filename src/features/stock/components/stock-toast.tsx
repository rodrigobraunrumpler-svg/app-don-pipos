import { Toast } from "@/components/ui/toast";

import type { UndoToastState } from "../hooks/use-undo-toast";

type Props = { toast: UndoToastState | null; onUndo: (requestId: string) => void; onHide: () => void };

// El aviso de una merma o un conteo guardado, con «Deshacer» mientras se ve
export function StockToast({ toast, onUndo, onHide }: Props) {
  if (!toast) return null;
  const { undoId } = toast;
  return (
    <Toast
      message={toast.message}
      actionLabel={undoId ? "Deshacer" : undefined}
      onAction={undoId ? () => onUndo(undoId) : undefined}
      onHide={onHide}
    />
  );
}
