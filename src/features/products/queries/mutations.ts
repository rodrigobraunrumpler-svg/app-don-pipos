import { mutationOptions } from "@tanstack/react-query";

import { reorderProducts, saveProduct, setProductPhoto, uploadProductPhoto } from "../api/products";
import { productKeys } from "./keys";

// Cambiar un precio espera la respuesta («Guardando…»): se copia a la web (PROJECT_CONTEXT.md §14.2)
export const saveProductMutation = mutationOptions({
  mutationFn: saveProduct,
  meta: { invalidates: [productKeys.all] },
});

export type PhotoInput = { productId: string; path: string; base64: string };

// La foto de un alfajor: se sube a su carpeta y se anota (la copia la lleva a la web). Sin señal queda en pausa y sigue
// sola al volver; si falla, la lista lo dice y se reintenta con la misma foto y la misma ruta
export const productPhotoMutation = mutationOptions({
  mutationKey: productKeys.photo,
  mutationFn: async (input: PhotoInput) => {
    await uploadProductPhoto({ path: input.path, base64: input.base64 });
    return setProductPhoto(input.productId, input.path);
  },
  meta: { invalidates: [productKeys.all] },
  // Sin señal espera a que vuelva (sin gastar sus reintentos); con mala señal se reintenta sola
  networkMode: "online",
  // De a una: dos fotos seguidas del mismo alfajor llegan en orden
  scope: { id: "product-photo" },
  retry: 3,
  // Una que falla queda un día en la caché (no 5 minutos): la lista la avisa con «Reintentar las fotos»
  gcTime: 24 * 60 * 60_000,
});

// Los ↑↓ de Ordenar
export const reorderProductsMutation = mutationOptions({
  mutationFn: reorderProducts,
  meta: { invalidates: [productKeys.all] },
});
