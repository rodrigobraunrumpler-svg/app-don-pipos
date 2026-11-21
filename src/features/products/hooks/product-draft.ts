import { createContext, useContext } from "react";

import { parsePrice } from "../rules/price";
import { DESCRIPTION_MAX, missingForWeb } from "../rules/web";
import type { Product, ProductInput } from "../schema/product";

// El alfajor que se está creando o cambiando (Nuevo, Editar y Vista previa lo comparten), y lo que la lista tiene que
// avisar al volver
export type PickedPhoto = { uri: string; width: number; height: number };
export type ProductDraft = {
  id: string | null;
  version: number | null;
  linked: boolean;
  name: string;
  priceText: string;
  costText: string;
  minStock: number;
  description: string;
  allergens: string[];
  showOnWeb: boolean;
  // Si ya se veía en la web al abrirlo: prenderlo ahora es «se publicó»
  wasOnWeb: boolean;
  // La foto nueva, todavía en el celular; la que ya está en la web; y si ya tiene una guardada
  photo: PickedPhoto | null;
  photoUrl: string | null;
  hasPhoto: boolean;
};
export type ListNotice = { kind: "published" | "saved"; product: Product };
// El alfajor recién publicado, que la lista sigue hasta que esté en la web (desde cuándo, para dejar de seguirlo)
export type Published = { id: string; at: number };

type DraftContext = {
  businessId: string | null;
  draft: ProductDraft;
  change: (patch: Partial<ProductDraft>) => void;
  start: (draft: ProductDraft) => void;
  notice: ListNotice | null;
  setNotice: (notice: ListNotice | null) => void;
  published: Published | null;
  setPublished: (published: Published | null) => void;
  // Al volver de un alfajor guardado: el aviso de la lista y, si se publicó, seguirlo
  finish: (product: Product, published: boolean) => void;
};

export const ProductDraftContext = createContext<DraftContext | null>(null);

export function useProductDraft(): DraftContext {
  const value = useContext(ProductDraftContext);
  if (!value) throw new Error("useProductDraft necesita ProductDraftProvider");
  return value;
}

const toText = (cents: number | null): string => (cents === null ? "" : (cents / 100).toFixed(2));

export const emptyDraft = (): ProductDraft => ({
  id: null,
  version: null,
  linked: false,
  name: "",
  priceText: "",
  costText: "",
  minStock: 0,
  description: "",
  allergens: [],
  showOnWeb: false,
  wasOnWeb: false,
  photo: null,
  photoUrl: null,
  hasPhoto: false,
});

export const draftFrom = (product: Product): ProductDraft => ({
  id: product.id,
  version: product.version,
  linked: product.linkedToWeb,
  name: product.name,
  priceText: toText(product.priceCents),
  costText: toText(product.costCents),
  minStock: product.minStock,
  description: product.description ?? "",
  // Una lista que guardó una versión anterior de la app puede llegar sin alérgenos
  allergens: product.allergens ?? [],
  showOnWeb: product.showOnWeb,
  wasOnWeb: product.showOnWeb && product.isActive,
  photo: null,
  photoUrl: product.imageUrl,
  hasPhoto: product.hasPhoto || product.imageUrl !== null,
});

// Lo que le falta para salir en la web (null: nada)
export const draftMissing = (draft: ProductDraft): string | null =>
  missingForWeb({
    linked: draft.linked,
    hasPhoto: draft.hasPhoto || draft.photo !== null,
    description: draft.description,
  });

// Lo que se guarda, o por qué todavía no. Prender «Se ve en la web» pide que no le falte nada; uno que ya se veía sigue
// viéndose aunque su foto todavía esté subiendo (la copia la espera)
export function inputFrom(draft: ProductDraft, showOnWeb: boolean): { input: ProductInput } | { problem: string } {
  const name = draft.name.trim();
  if (name.length === 0 || name.length > 40) return { problem: "Escribe el nombre del alfajor (hasta 40 letras)." };
  const priceCents = parsePrice(draft.priceText);
  if (priceCents === null) return { problem: "Escribe un precio mayor que cero." };
  const costEmpty = draft.costText.trim() === "";
  const costCents = costEmpty ? null : parsePrice(draft.costText);
  if (!costEmpty && costCents === null) return { problem: "Escribe un costo mayor que cero, o déjalo vacío." };
  const description = draft.description.trim();
  if (description.length > DESCRIPTION_MAX) return { problem: `La descripción va hasta ${DESCRIPTION_MAX} letras.` };
  return {
    input: {
      id: draft.id,
      expectedVersion: draft.version,
      name,
      priceCents,
      costCents,
      minStock: draft.minStock,
      showOnWeb: showOnWeb && (draft.wasOnWeb || draftMissing(draft) === null),
      description: description || null,
      allergens: draft.allergens,
    },
  };
}
