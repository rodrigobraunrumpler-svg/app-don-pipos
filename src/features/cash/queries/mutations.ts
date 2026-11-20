import { mutationOptions } from "@tanstack/react-query";

import { closeCashDay } from "../api/cash";

export const closeCashDayMutation = mutationOptions({ mutationFn: closeCashDay });
