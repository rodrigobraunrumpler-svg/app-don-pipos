import { shouldAskUnlock } from "./lock";

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 19, 16, minutes));

test("con 0 minutos pide siempre", () => expect(shouldAskUnlock(at(0), at(0), 0)).toBe(true));
test("con 5 minutos, a los 4 no pide", () => expect(shouldAskUnlock(at(0), at(4), 5)).toBe(false));
test("con 5 minutos, a los 5 pide", () => expect(shouldAskUnlock(at(0), at(5), 5)).toBe(true));
test("si nunca pasó a segundo plano, no pide", () => expect(shouldAskUnlock(null, at(30), 1)).toBe(false));
test("si el reloj del celular se atrasó, pide", () => expect(shouldAskUnlock(at(10), at(5), 5)).toBe(true));
