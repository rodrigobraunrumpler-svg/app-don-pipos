import { useMutation } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";

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
