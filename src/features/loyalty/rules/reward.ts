import type { LoyaltyRule } from "../schema/loyalty";

// El premio está listo con la fidelidad activa y los sellos en la meta o más
export const isRewardReady = (rule: LoyaltyRule, stamps: number): boolean => rule.isActive && stamps >= rule.goal;

// Cuánto vale el premio en este pedido, para la vista previa (la base hace la misma cuenta al guardar): el alfajor más
// barato del pedido, el descuento sin pasar del total, u otro premio en 0 porque se entrega aparte
export function rewardAmount(
  rule: LoyaltyRule,
  lines: { unitPriceCents: number; quantity: number }[],
  totalCents: number,
): number {
  if (rule.rewardKind === "discount") return Math.min(rule.rewardAmountCents ?? 0, totalCents);
  if (rule.rewardKind === "other") return 0;
  const prices = lines.filter((line) => line.quantity > 0).map((line) => line.unitPriceCents);
  return prices.length > 0 ? Math.min(...prices) : 0;
}
