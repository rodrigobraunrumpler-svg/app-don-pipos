import { createContext, useContext, useState } from "react";

import { useRequestId } from "@/lib/use-request-id";

import { SETUP_EXPENSE_CATEGORIES } from "../constants";

// Lo que el dueño va poniendo en la puesta en marcha: el stock de cada alfajor y los tipos de gasto marcados. Vive en
// el layout de sus pasos: volver atrás no pierde nada
export type SetupDraft = {
  counts: Record<string, number>;
  setCount: (productId: string, value: number) => void;
  chosen: Record<string, boolean>;
  toggle: (name: string) => void;
  requestId: string;
};

export const SetupDraftContext = createContext<SetupDraft | null>(null);

export function useSetupDraftState(): SetupDraft {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [chosen, setChosen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SETUP_EXPENSE_CATEGORIES.map((category) => [category.name, category.chosen])),
  );
  const { requestId } = useRequestId();
  return {
    counts,
    setCount: (productId, value) => setCounts((current) => ({ ...current, [productId]: value })),
    chosen,
    toggle: (name) => setChosen((current) => ({ ...current, [name]: !current[name] })),
    requestId,
  };
}

export function useSetupDraft(): SetupDraft {
  const draft = useContext(SetupDraftContext);
  if (!draft) throw new Error("useSetupDraft va dentro de SetupDraftProvider (src/app/setup/_layout.tsx)");
  return draft;
}
