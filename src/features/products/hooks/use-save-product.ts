import { useMutation } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";

import { errorMessage, toAppError } from "@/lib/errors";
import { shrinkPhoto } from "@/lib/images";

import { productPhotoMutation, saveProductMutation } from "../queries/mutations";
import { webName } from "../rules/web";
import type { Product, ProductInput } from "../schema/product";
import { useProductDraft, type PickedPhoto } from "./product-draft";

// Algo que impidió guardar antes de llegar a la base (nada se guardó), con su texto para el dueño
class NotSaved extends Error {}

// Guarda el alfajor y, si hay una foto nueva, la sube a su carpeta. La foto se prepara (se achica) antes de guardar: si
// no se puede, o todavía no se sabe el negocio, no se guarda nada y la pantalla lo dice. «Guardando…» dura todo eso. La
// subida no se espera: sin señal queda pendiente y la lista lo dice; el alfajor ya está guardado
export function useSaveProduct(): {
  save: (input: ProductInput, photo: PickedPhoto | null) => Promise<Product>;
  saving: boolean;
} {
  const { businessId } = useProductDraft();
  const product = useMutation(saveProductMutation);
  const photoUpload = useMutation(productPhotoMutation);
  const [busy, setBusy] = useState(false);

  async function prepare(photo: PickedPhoto | null): Promise<{ business: string; base64: string } | null> {
    if (!photo) return null;
    if (!businessId) throw new NotSaved("Todavía se está cargando tu negocio. Espera un momento y vuelve a guardar.");
    try {
      return { business: businessId, base64: await shrinkPhoto(photo) };
    } catch {
      throw new NotSaved("No se pudo preparar la foto. Elige otra o tómala de nuevo.");
    }
  }

  async function save(input: ProductInput, photo: PickedPhoto | null): Promise<Product> {
    setBusy(true);
    try {
      const ready = await prepare(photo);
      const saved = await product.mutateAsync(input);
      if (ready) {
        const path = `${ready.business}/${saved.id}/${randomUUID()}.jpg`;
        photoUpload.mutate({ productId: saved.id, path, base64: ready.base64 });
      }
      return saved;
    } finally {
      setBusy(false);
    }
  }
  return { save, saving: busy };
}

// Por qué no se guardó. Un conflicto es un nombre repetido (al crear, o si otro alfajor ya se llama así en la web) o,
// si no, otro cambio que llegó antes
export function saveProblem(error: unknown, id: string | null, name: string, products: Product[] = []): string {
  if (error instanceof NotSaved) return error.message;
  if (toAppError(error).kind !== "conflict") return errorMessage(error);
  const taken = products.some(
    (other) => other.id !== id && webName(other.name).toLowerCase() === webName(name).toLowerCase(),
  );
  return id === null || taken
    ? "Ya tienes un alfajor con ese nombre."
    : `${name} ya tenía otro cambio guardado: vuelve a abrirlo y guarda otra vez.`;
}
