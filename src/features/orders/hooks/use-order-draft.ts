import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { draftStateSchema, type DraftState } from "../schema/draft";

const KEY = "orders.draft";

export const EMPTY_DRAFT: DraftState = {
  quantities: {},
  phone: "",
  name: "",
  fulfillment: "pickup",
  address: "",
  scheduledFor: null,
  promisedTime: "",
  discountCents: 0,
  discountReason: "",
  paymentMode: "none",
  paymentMethod: null,
  paymentCents: 0,
  note: "",
  updatedAt: null,
};

const hasItems = (draft: DraftState) => Object.values(draft.quantities).some((quantity) => quantity > 0);

// El pedido a medio anotar vive en el celular: sobrevive a cerrar la app y se borra al guardarlo (orders.md §6)
export function useOrderDraft() {
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [ready, setReady] = useState(false);
  const [recoveredAt, setRecoveredAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((text) => {
        const saved = text ? draftStateSchema.safeParse(JSON.parse(text)) : null;
        if (!active || !saved?.success) return;
        setDraft(saved.data);
        if (hasItems(saved.data)) setRecoveredAt(saved.data.updatedAt);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Cada cambio queda guardado (un borrador recién vaciado no tiene fecha y no se guarda)
  useEffect(() => {
    if (ready && draft.updatedAt) void AsyncStorage.setItem(KEY, JSON.stringify(draft));
  }, [draft, ready]);

  const update = useCallback(
    (patch: Partial<DraftState>) =>
      setDraft((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() })),
    [],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      setDraft((current) => ({
        ...current,
        quantities: { ...current.quantities, [productId]: quantity },
        updatedAt: new Date().toISOString(),
      })),
    [],
  );

  const clear = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    setRecoveredAt(null);
    void AsyncStorage.removeItem(KEY);
  }, []);

  return { draft, ready, recoveredAt, update, setQuantity, clear };
}
