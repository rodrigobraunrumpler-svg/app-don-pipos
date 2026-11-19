import { attemptsLabel } from "./attempts";

test("4 intentos", () => expect(attemptsLabel(4)).toBe("Te quedan 4 intentos"));
test("1 intento", () => expect(attemptsLabel(1)).toBe("Te queda 1 intento"));
