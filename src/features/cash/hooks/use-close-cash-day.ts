import { useMutation } from "@tanstack/react-query";

import { cashKeys } from "../queries/keys";
import { closeCashDayMutation } from "../queries/mutations";

// Cerrar el día espera la respuesta («Guardando…») y refresca el cuadre
export const useCloseCashDay = () => useMutation({ ...closeCashDayMutation, meta: { invalidates: [cashKeys.all] } });
