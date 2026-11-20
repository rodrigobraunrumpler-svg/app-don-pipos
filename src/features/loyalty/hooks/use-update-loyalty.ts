import { useMutation } from "@tanstack/react-query";

import { loyaltyKeys } from "../queries/keys";
import { updateLoyaltySettingsMutation } from "../queries/mutations";

// Guardar la regla espera la respuesta («Guardando…») y refresca la fidelidad, también si falla (pudo llegar otra antes)
export const useUpdateLoyaltySettings = () =>
  useMutation({ ...updateLoyaltySettingsMutation, meta: { invalidates: [loyaltyKeys.all] } });
