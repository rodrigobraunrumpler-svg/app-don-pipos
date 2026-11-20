import { useMutation } from "@tanstack/react-query";

import { cashKeys } from "@/features/cash";

import { incomeKeys } from "../queries/keys";
import { createManualIncomeMutation, voidManualIncomeMutation } from "../queries/mutations";

// Un ingreso a mano cambia los ingresos y, si es en efectivo, el cuadre de caja
const meta = { invalidates: [incomeKeys.all, cashKeys.all] };

export const useCreateManualIncome = () => useMutation({ ...createManualIncomeMutation, meta });
export const useVoidManualIncome = () => useMutation({ ...voidManualIncomeMutation, meta });
