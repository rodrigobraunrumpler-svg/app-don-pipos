import { formatCents, parseSoles } from "@/lib/money";

import type { LoyaltySettings, RewardKind, StampUnit } from "../schema/loyalty";

// La meta según la unidad, como la base (loyalty.md §2)
export const GOAL_RANGE: Record<StampUnit, [number, number]> = { order: [3, 30], item: [5, 100] };
const MAX_DISCOUNT_CENTS = 100_000;
const MAX_TEXT = 60;

// Lo que se edita en Fidelidad: el monto y el texto como se escriben
export type LoyaltyDraft = {
  isActive: boolean;
  stampUnit: StampUnit;
  goal: number;
  rewardKind: RewardKind;
  amountText: string;
  rewardText: string;
};

export function clampGoal(goal: number, unit: StampUnit): number {
  const [min, max] = GOAL_RANGE[unit];
  return Math.min(Math.max(goal, min), max);
}

export function draftFromSettings(settings: LoyaltySettings): LoyaltyDraft {
  return {
    isActive: settings.isActive,
    stampUnit: settings.stampUnit,
    goal: settings.goal,
    rewardKind: settings.rewardKind,
    amountText: settings.rewardAmountCents === null ? "" : (settings.rewardAmountCents / 100).toFixed(2),
    rewardText: settings.rewardText ?? "",
  };
}

// Lo que se manda a la base: el monto solo si es un descuento y el texto solo si es otro premio
export function draftToInput(draft: LoyaltyDraft) {
  return {
    isActive: draft.isActive,
    stampUnit: draft.stampUnit,
    goal: draft.goal,
    rewardKind: draft.rewardKind,
    rewardAmountCents: draft.rewardKind === "discount" ? parseSoles(draft.amountText) : null,
    rewardText: draft.rewardKind === "other" ? draft.rewardText.trim() : null,
  };
}

// Por qué todavía no se puede guardar, o null
export function draftProblem(draft: LoyaltyDraft): string | null {
  if (draft.rewardKind === "discount") {
    const cents = parseSoles(draft.amountText);
    if (!cents) return "Escribe el monto del descuento.";
    if (cents > MAX_DISCOUNT_CENTS) return `El descuento va hasta ${formatCents(MAX_DISCOUNT_CENTS)}.`;
  }
  if (draft.rewardKind === "other") {
    const text = draft.rewardText.trim();
    if (!text) return "Escribe el premio.";
    if (text.length > MAX_TEXT) return `El premio va en hasta ${MAX_TEXT} letras.`;
  }
  return null;
}
