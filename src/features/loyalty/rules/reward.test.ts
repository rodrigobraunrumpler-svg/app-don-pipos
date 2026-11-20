import { isRewardReady, rewardAmount } from "./reward";

const rule = (overrides = {}) => ({
  isActive: true,
  stampUnit: "order" as const,
  goal: 10,
  rewardKind: "free_item" as const,
  rewardAmountCents: null,
  rewardText: null,
  ...overrides,
});
const LINES = [
  { unitPriceCents: 1200, quantity: 2 },
  { unitPriceCents: 1300, quantity: 1 },
];

test("el premio está listo con la fidelidad activa y los sellos en la meta o más", () => {
  expect(isRewardReady(rule(), 10)).toBe(true);
  expect(isRewardReady(rule(), 12)).toBe(true);
  expect(isRewardReady(rule(), 9)).toBe(false);
  expect(isRewardReady(rule({ isActive: false }), 10)).toBe(false);
});

test("cuánto vale el premio en este pedido (loyalty.md §5)", () => {
  // 2 Coquetas (S/ 12.00) + 1 Pipo Crush (S/ 13.00) → el alfajor más barato
  expect(rewardAmount(rule(), LINES, 3700)).toBe(1200);
  expect(rewardAmount(rule(), [{ unitPriceCents: 1300, quantity: 0 }], 0)).toBe(0);
  expect(rewardAmount(rule({ rewardKind: "discount", rewardAmountCents: 1000 }), LINES, 3700)).toBe(1000);
  expect(rewardAmount(rule({ rewardKind: "discount", rewardAmountCents: 5000 }), LINES, 3700)).toBe(3700);
  expect(rewardAmount(rule({ rewardKind: "other", rewardText: "Un llavero (DEMO)" }), LINES, 3700)).toBe(0);
  expect(rewardAmount(rule({ rewardKind: "discount" }), LINES, 3700)).toBe(0);
});
