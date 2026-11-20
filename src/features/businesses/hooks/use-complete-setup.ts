import { useMutation } from "@tanstack/react-query";

import { stockKeys } from "@/features/stock";

import { completeSetupMutation } from "../queries/mutations";

// Terminar la puesta en marcha. No marca el negocio en la caché: si lo hiciera, la puerta del layout raíz sacaría al
// dueño antes de «Todo listo». Eso lo hace «Ir a Inicio»
export function useCompleteSetup() {
  return useMutation({ ...completeSetupMutation, meta: { invalidates: [stockKeys.all] } });
}
