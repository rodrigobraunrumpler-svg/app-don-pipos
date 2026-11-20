import { mutationOptions } from "@tanstack/react-query";

import { updateLoyaltySettings } from "../api/loyalty";

export const updateLoyaltySettingsMutation = mutationOptions({ mutationFn: updateLoyaltySettings });
