import { useMutation } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";

import { errorMessage, toAppError } from "@/lib/errors";
import { shrinkPhoto } from "@/lib/images";

import { productPhotoMutation, saveProductMutation } from "../queries/mutations";
import type { Product, ProductInput } from "../schema/product";
import { useProductDraft, type PickedPhoto } from "./product-draft";

// Guarda el alfajor y, si hay una foto nueva, la achica y la sube a su carpeta. La foto no se espera: sin señal queda
// pendiente y la lista lo dice; el alfajor ya está guardado
export function useSaveProduct(): {
  save: (input: ProductInput, photo: PickedPhoto | null) => Promise<Product>;
  saving: boolean;
} {
  const { businessId } = useProductDraft();
  const product = useMutation(saveProductMutation);
  const photoUpload = useMutation(productPhotoMutation);

  async function save(input: ProductInput, photo: PickedPhoto | null): Promise<Product> {
    const saved = await product.mutateAsync(input);
    if (photo && businessId) {
      const base64 = await shrinkPhoto(photo);
      photoUpload.mutate({ productId: saved.id, path: `${businessId}/${saved.id}/${randomUUID()}.jpg`, base64 });
    }
    return saved;
  }
  return { save, saving: product.isPending };
}

// Por qué no se guardó. Un conflicto al crear es un nombre repetido; al cambiar, otro cambio que llegó antes
export function saveProblem(error: unknown, isNew: boolean, name: string): string {
  if (toAppError(error).kind !== "conflict") return errorMessage(error);
  return isNew
    ? "Ya tienes un alfajor con ese nombre."
    : `${name} ya tenía otro cambio guardado: vuelve a abrirlo y guarda otra vez.`;
}
