import { useMutation, useQueryClient } from "@tanstack/react-query";

import { loyaltyKeys } from "../queries/keys";
import { updateLoyaltySettingsMutation } from "../queries/mutations";

// Guardar la regla espera la respuesta («Guardando…»), deja al instante lo que devolvió la base y refresca la fidelidad,
// también si falla (pudo llegar otra antes)
export function useUpdateLoyaltySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    ...updateLoyaltySettingsMutation,
    meta: { invalidates: [loyaltyKeys.all] },
    onSuccess: (saved) => queryClient.setQueryData(loyaltyKeys.settings, saved),
  });
}
