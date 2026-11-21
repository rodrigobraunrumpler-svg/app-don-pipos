import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "../queries/keys";
import { productPhotoMutation, type PhotoInput } from "../queries/mutations";

// Las fotos que todavía no se subieron: sin señal (en pausa), reintentándose, o que fallaron. Las que fallaron se
// reintentan con la misma foto y la misma ruta
export function usePendingPhotos(): { waiting: Set<string>; failed: number; retryAll: () => void } {
  const queryClient = useQueryClient();
  const photo = useMutation(productPhotoMutation);
  const waiting = useMutationState({
    filters: {
      mutationKey: productKeys.photo,
      predicate: (m) =>
        m.state.status === "error" || m.state.isPaused || (m.state.status === "pending" && m.state.failureCount > 0),
    },
    select: (m) => m.state.variables as PhotoInput,
  });
  const failed = useMutationState({
    filters: { mutationKey: productKeys.photo, status: "error" },
    select: (m) => m.state.variables as PhotoInput,
  });
  const byProduct = [...new Map(failed.map((input) => [input.productId, input])).values()];

  function retryAll() {
    const cache = queryClient.getMutationCache();
    for (const old of cache.findAll({ mutationKey: productKeys.photo, status: "error" })) cache.remove(old);
    for (const input of byProduct) void photo.mutateAsync(input).catch(() => undefined);
  }
  return { waiting: new Set(waiting.map((input) => input.productId)), failed: byProduct.length, retryAll };
}
