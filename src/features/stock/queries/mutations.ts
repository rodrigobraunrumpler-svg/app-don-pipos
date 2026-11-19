import { mutationOptions } from "@tanstack/react-query";

import { registerStockCount, registerWaste, revertStockChange } from "../api/stock";
import { stockKeys } from "./keys";

// Las del stock van en fila (`scope`): una merma y un conteo del mismo alfajor no se cruzan.
// La respuesta al instante (con vuelta atrás) la ponen los hooks, que tienen el cliente de consultas
export const registerWasteMutation = mutationOptions({
  mutationFn: registerWaste,
  scope: { id: "stock" },
  meta: { invalidates: [stockKeys.all] },
});

export const registerStockCountMutation = mutationOptions({
  mutationFn: registerStockCount,
  scope: { id: "stock" },
  meta: { invalidates: [stockKeys.all] },
});

export const revertStockChangeMutation = mutationOptions({
  mutationFn: revertStockChange,
  scope: { id: "stock" },
  meta: { invalidates: [stockKeys.all] },
});
