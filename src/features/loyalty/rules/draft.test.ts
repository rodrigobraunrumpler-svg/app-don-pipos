import { clampGoal, draftFromSettings, draftProblem, draftToInput, GOAL_RANGE } from "./draft";

const SETTINGS = {
  isActive: true,
  stampUnit: "order" as const,
  goal: 10,
  rewardKind: "discount" as const,
  rewardAmountCents: 1050,
  rewardText: null,
  version: 3,
};

test("la meta va de 3 a 30 por compra y de 5 a 100 por alfajor", () => {
  expect(GOAL_RANGE).toEqual({ order: [3, 30], item: [5, 100] });
  expect(clampGoal(60, "order")).toBe(30);
  expect(clampGoal(3, "item")).toBe(5);
  expect(clampGoal(12, "item")).toBe(12);
});

test("el formulario sale de la regla guardada y vuelve a ella para guardarse", () => {
  const draft = draftFromSettings(SETTINGS);
  expect(draft).toEqual({
    isActive: true,
    stampUnit: "order",
    goal: 10,
    rewardKind: "discount",
    amountText: "10.50",
    rewardText: "",
  });
  expect(draftToInput(draft)).toEqual({
    isActive: true,
    stampUnit: "order",
    goal: 10,
    rewardKind: "discount",
    rewardAmountCents: 1050,
    rewardText: null,
  });
  expect(draftToInput({ ...draft, rewardKind: "other", rewardText: " Un llavero (DEMO) " })).toMatchObject({
    rewardAmountCents: null,
    rewardText: "Un llavero (DEMO)",
  });
  expect(draftFromSettings({ ...SETTINGS, rewardKind: "free_item", rewardAmountCents: null }).amountText).toBe("");
});

test("lo que falta para poder guardar", () => {
  const draft = draftFromSettings(SETTINGS);
  expect(draftProblem(draft)).toBeNull();
  expect(draftProblem({ ...draft, amountText: "" })).toBe("Escribe el monto del descuento.");
  expect(draftProblem({ ...draft, amountText: "1000.01" })).toBe("El descuento va hasta S/ 1,000.00.");
  expect(draftProblem({ ...draft, rewardKind: "other", rewardText: "  " })).toBe("Escribe el premio.");
  expect(draftProblem({ ...draft, rewardKind: "other", rewardText: "a".repeat(61) })).toBe(
    "El premio va en hasta 60 letras.",
  );
  expect(draftProblem({ ...draft, rewardKind: "free_item", amountText: "" })).toBeNull();
  expect(draftProblem({ ...draft, rewardKind: "other", rewardText: "Un llavero (DEMO)" })).toBeNull();
});
