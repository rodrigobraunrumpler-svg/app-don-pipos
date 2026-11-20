import { useQuery } from "@tanstack/react-query";

import { customerByPhoneQuery } from "@/features/customers";
import { isRewardReady, loyaltySettingsQuery, rewardAmount, rewardLabel } from "@/features/loyalty";

export type DraftReward = { name: string; label: string; amountCents: number };

// El premio de fidelidad del cliente del teléfono, si está listo: su nombre, el premio y cuánto vale en este pedido
// (vista previa: la base hace la misma cuenta al guardar). null si no hay premio
export function useDraftReward(
  phone: string | null,
  lines: { unitPriceCents: number; quantity: number }[],
  beforeDiscountCents: number,
): DraftReward | null {
  const match = useQuery(customerByPhoneQuery(phone)).data;
  const rule = useQuery(loyaltySettingsQuery).data;
  if (!match || !rule || !isRewardReady(rule, match.stamps)) return null;
  return {
    name: match.name.replace(/ .*/, ""),
    label: rewardLabel(rule),
    amountCents: rewardAmount(rule, lines, beforeDiscountCents),
  };
}
