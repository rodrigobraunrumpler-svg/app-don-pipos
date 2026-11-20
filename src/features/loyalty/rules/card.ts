import { formatCents } from "@/lib/money";

import type { LoyaltyRule } from "../schema/loyalty";

// «Le faltan 3 compras para su premio», «Le faltan 4 alfajores para su premio» o «Premio listo»
export function cardText(rule: LoyaltyRule, stamps: number): string {
  const missing = rule.goal - stamps;
  if (missing <= 0) return "Premio listo";
  const unit =
    rule.stampUnit === "item" ? (missing === 1 ? "alfajor" : "alfajores") : missing === 1 ? "compra" : "compras";
  return `Le ${missing === 1 ? "falta" : "faltan"} ${missing} ${unit} para su premio`;
}

// El premio en palabras: «1 alfajor gratis», «S/ 10.00 de descuento» o el texto del dueño
export function rewardLabel(rule: LoyaltyRule): string {
  if (rule.rewardKind === "discount") return `${formatCents(rule.rewardAmountCents ?? 0)} de descuento`;
  if (rule.rewardKind === "other") return rule.rewardText ?? "";
  return "1 alfajor gratis";
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

// La línea de la tarjeta de sellos (la maqueta): lo que le falta y el premio, o que el premio está listo
export function cardLine(rule: LoyaltyRule, stamps: number): string {
  if (stamps < rule.goal) return `${cardText(rule, stamps)}: ${lowerFirst(rewardLabel(rule))}.`;
  if (rule.rewardKind === "other") return `Premio listo: ${rewardLabel(rule)}, en su próximo pedido.`;
  return "Premio listo: se aplica como descuento en su próximo pedido.";
}

// {sellos} en el mensaje de entregado (la maqueta); con la fidelidad apagada, nada
export function stampsMessage(rule: LoyaltyRule, stamps: number): string {
  if (!rule.isActive) return "";
  if (stamps < rule.goal) return `Llevas ${stamps} de ${rule.goal} sellos para tu premio.`;
  const reward = rule.rewardKind === "other" ? `tu premio: ${rewardLabel(rule)}` : rewardLabel(rule);
  return `Completaste tu tarjeta de sellos: tu próximo pedido lleva ${reward}.`;
}

// En «Cerca del premio»: «Le faltan 2», «Le falta 1» o «Premio listo»
export function nearRewardText(rule: LoyaltyRule, stamps: number): string {
  const missing = rule.goal - stamps;
  if (missing <= 0) return "Premio listo";
  return missing === 1 ? "Le falta 1" : `Le faltan ${missing}`;
}
