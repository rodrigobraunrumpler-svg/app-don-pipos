import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

import { stockOverviewQuery } from "@/features/stock";
import { useRequestId } from "@/lib/use-request-id";

import { SETUP_EXPENSE_CATEGORIES } from "../constants";

// Lo que el dueño va poniendo en la puesta en marcha: el stock de cada alfajor y los tipos de gasto marcados. Vive en
// el layout de sus pasos: volver atrás no pierde nada. Cada alfajor empieza en lo que ya hay en la nevera (0 en un
// negocio nuevo): «Terminar» sin tocarlo no cambia el stock de un negocio que ya lo llevaba
export type SetupDraft = {
  countOf: (productId: string) => number;
  setCount: (productId: string, value: number) => void;
  chosen: Record<string, boolean>;
  toggle: (name: string) => void;
  requestId: string;
  stock: { ready: boolean; failed: boolean; retry: () => void };
};

export const SetupDraftContext = createContext<SetupDraft | null>(null);

export function useSetupDraftState(): SetupDraft {
  const overview = useQuery(stockOverviewQuery);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [chosen, setChosen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SETUP_EXPENSE_CATEGORIES.map((category) => [category.name, category.chosen])),
  );
  const { requestId } = useRequestId();
  const physical = (productId: string) =>
    Math.max(0, overview.data?.find((item) => item.productId === productId)?.physical ?? 0);
  return {
    countOf: (productId) => counts[productId] ?? physical(productId),
    setCount: (productId, value) => setCounts((current) => ({ ...current, [productId]: value })),
    chosen,
    toggle: (name) => setChosen((current) => ({ ...current, [name]: !current[name] })),
    requestId,
    stock: { ready: overview.data !== undefined, failed: overview.isError, retry: () => void overview.refetch() },
  };
}

export function useSetupDraft(): SetupDraft {
  const draft = useContext(SetupDraftContext);
  if (!draft) throw new Error("useSetupDraft va dentro de SetupDraftProvider (src/app/setup/_layout.tsx)");
  return draft;
}
