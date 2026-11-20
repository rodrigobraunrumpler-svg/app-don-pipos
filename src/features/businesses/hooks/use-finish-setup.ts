import { useQueryClient } from "@tanstack/react-query";

import { markFirstTip } from "@/lib/first-tip";

import { businessesKeys } from "../queries/keys";
import type { Business } from "../schema/business";

// «Ir a Inicio»: deja la marca del consejo de la primera vez y el negocio con la puesta en marcha hecha. La puerta del
// layout raíz lleva a Inicio sola; todo lo demás se vuelve a pedir (el stock y los tipos de gasto son nuevos)
export function useFinishSetup(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await markFirstTip();
    queryClient.setQueryData<Business>(businessesKeys.all, (business) => business && { ...business, setupDone: true });
    await queryClient.invalidateQueries();
  };
}
