import { cardLine, cardText, nearRewardText, rewardLabel, stampsMessage } from "./card";

const rule = (overrides = {}) => ({
  isActive: true,
  stampUnit: "order" as const,
  goal: 10,
  rewardKind: "free_item" as const,
  rewardAmountCents: null,
  rewardText: null,
  ...overrides,
});

test("el texto de la tarjeta (loyalty.md §5)", () => {
  expect(cardText(rule(), 7)).toBe("Le faltan 3 compras para su premio");
  expect(cardText(rule(), 9)).toBe("Le falta 1 compra para su premio");
  expect(cardText(rule({ stampUnit: "item" }), 6)).toBe("Le faltan 4 alfajores para su premio");
  expect(cardText(rule({ stampUnit: "item" }), 9)).toBe("Le falta 1 alfajor para su premio");
  expect(cardText(rule(), 10)).toBe("Premio listo");
});

test("el premio en palabras", () => {
  expect(rewardLabel(rule())).toBe("1 alfajor gratis");
  expect(rewardLabel(rule({ rewardKind: "discount", rewardAmountCents: 1000 }))).toBe("S/ 10.00 de descuento");
  expect(rewardLabel(rule({ rewardKind: "other", rewardText: "Un llavero (DEMO)" }))).toBe("Un llavero (DEMO)");
  // Una regla a medio escribir (sin monto o sin texto) no rompe nada
  expect(rewardLabel(rule({ rewardKind: "discount" }))).toBe("S/\u00a00.00 de descuento");
  expect(rewardLabel(rule({ rewardKind: "other" }))).toBe("");
});

test("la línea de la tarjeta, como la maqueta", () => {
  expect(cardLine(rule(), 7)).toBe("Le faltan 3 compras para su premio: 1 alfajor gratis.");
  expect(cardLine(rule(), 10)).toBe("Premio listo: se aplica como descuento en su próximo pedido.");
  expect(cardLine(rule({ rewardKind: "other", rewardText: "Un llavero (DEMO)" }), 11)).toBe(
    "Premio listo: Un llavero (DEMO), en su próximo pedido.",
  );
});

test("los sellos en el mensaje de entregado", () => {
  expect(stampsMessage(rule(), 7)).toBe("Llevas 7 de 10 sellos para tu premio.");
  expect(stampsMessage(rule(), 10)).toBe("Completaste tu tarjeta de sellos: tu próximo pedido lleva 1 alfajor gratis.");
  expect(stampsMessage(rule({ rewardKind: "discount", rewardAmountCents: 1000 }), 12)).toBe(
    "Completaste tu tarjeta de sellos: tu próximo pedido lleva S/ 10.00 de descuento.",
  );
  expect(stampsMessage(rule({ rewardKind: "other", rewardText: "Un llavero (DEMO)" }), 10)).toBe(
    "Completaste tu tarjeta de sellos: tu próximo pedido lleva tu premio: Un llavero (DEMO).",
  );
  expect(stampsMessage(rule({ isActive: false }), 7)).toBe("");
});

test("cuánto le falta en «Cerca del premio»", () => {
  expect(nearRewardText(rule(), 8)).toBe("Le faltan 2");
  expect(nearRewardText(rule(), 9)).toBe("Le falta 1");
  expect(nearRewardText(rule(), 11)).toBe("Premio listo");
});
