import { useMemo, useState, type ReactNode } from "react";

import {
  emptyDraft,
  ProductDraftContext,
  type ListNotice,
  type ProductDraft,
  type Published,
} from "../hooks/product-draft";
import type { Product } from "../schema/product";

// El borrador del alfajor para Nuevo, Editar y Vista previa (las pantallas de Productos y precios), y el aviso que la
// lista muestra al volver. El negocio lo pone la pantalla: la foto va a su carpeta
export function ProductDraftProvider({ businessId, children }: { businessId: string | null; children: ReactNode }) {
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [notice, setNotice] = useState<ListNotice | null>(null);
  const [published, setPublished] = useState<Published | null>(null);
  const value = useMemo(
    () => ({
      businessId,
      draft,
      change: (patch: Partial<ProductDraft>) => setDraft((current) => ({ ...current, ...patch })),
      start: setDraft,
      notice,
      setNotice,
      published,
      setPublished,
      finish: (product: Product, isPublished: boolean) => {
        setNotice({ kind: isPublished ? "published" : "saved", product });
        setPublished(isPublished ? { id: product.id, at: Date.now() } : null);
      },
    }),
    [businessId, draft, notice, published],
  );
  return <ProductDraftContext.Provider value={value}>{children}</ProductDraftContext.Provider>;
}
