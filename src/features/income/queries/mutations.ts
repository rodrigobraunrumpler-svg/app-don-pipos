import { mutationOptions } from "@tanstack/react-query";

import { createManualIncome, voidManualIncome } from "../api/income";

export const createManualIncomeMutation = mutationOptions({ mutationFn: createManualIncome });
export const voidManualIncomeMutation = mutationOptions({ mutationFn: voidManualIncome });
