import { AppError, errorMessage, isRetryable, toAppError } from "@/lib/errors";

test("un AppError pasa igual", () => {
  const error = new AppError("conflict");
  expect(toAppError(error)).toBe(error);
});

test.each([
  [new TypeError("Network request failed"), "offline"],
  [new TypeError("Failed to fetch"), "offline"],
  [new TypeError("Cannot read properties of undefined (reading 'id')"), "unexpected"],
  [{ code: "P0001", message: "invalid" }, "invalid"],
  [{ code: "P0001", message: "not_found" }, "notFound"],
  [{ code: "P0001", message: "forbidden" }, "forbidden"],
  [{ code: "P0001", message: "conflict" }, "conflict"],
  [{ code: "42501", message: "permission denied for table orders" }, "forbidden"],
  [{ code: "PGRST301", message: "JWT expired" }, "forbidden"],
  [{ code: "23505", message: "duplicate key value" }, "conflict"],
  [{ code: "PGRST116", message: "0 rows" }, "notFound"],
  [{ code: "P0001", message: "otra cosa" }, "unexpected"],
  [{ code: "P0001", message: "constructor" }, "unexpected"],
  [{ code: "P0001" }, "unexpected"],
  [{ code: "toString", message: "x" }, "unexpected"],
  ["boom", "unexpected"],
  [null, "unexpected"],
  [{ raro: true }, "unexpected"],
])("%p se convierte en %s", (input, kind) => {
  expect(toAppError(input).kind).toBe(kind);
});

test("lo inesperado guarda lo recibido y nunca lo muestra", () => {
  const error = toAppError({ code: "XX000", message: 'relation "orders" does not exist' });
  expect(error.cause).toEqual({ code: "XX000", message: 'relation "orders" does not exist' });
  expect(errorMessage(error)).toBe("Algo salió mal de nuestro lado. Vuelve a intentar en un momento.");
});

test.each([
  ["offline", "Sin conexión. Revisa tu señal y vuelve a intentar."],
  ["notFound", "No encontramos lo que buscabas. Puede que ya no exista."],
  ["forbidden", "No tienes permiso para hacer esto. Vuelve a ingresar."],
  ["invalid", "Hay un dato que no es válido. Revísalo y vuelve a intentar."],
  ["conflict", "Alguien cambió esto antes. Actualiza y vuelve a intentar."],
  ["unexpected", "Algo salió mal de nuestro lado. Vuelve a intentar en un momento."],
] as const)("el texto de %s", (kind, text) => {
  expect(errorMessage(new AppError(kind))).toBe(text);
});

// Lo que llega de una consulta no siempre es un AppError: TanStack Query entrega tal cual lo que lanzó la función
const UNEXPECTED_TEXT = "Algo salió mal de nuestro lado. Vuelve a intentar en un momento.";
const zodLikeError = Object.assign(new Error("Invalid input: expected number, received string"), {
  name: "ZodError",
  issues: [{ code: "invalid_type", expected: "number", path: ["totalCents"], message: "Invalid input" }],
});

test.each([
  ["un TypeError de un descuido en el código", new TypeError("x is not a function"), UNEXPECTED_TEXT, true],
  [
    "un TypeError de la red",
    new TypeError("Network request failed"),
    "Sin conexión. Revisa tu señal y vuelve a intentar.",
    true,
  ],
  ["un texto suelto", "boom", UNEXPECTED_TEXT, true],
  ["null", null, UNEXPECTED_TEXT, true],
  ["undefined", undefined, UNEXPECTED_TEXT, true],
  ["un error de Zod al leer la respuesta", zodLikeError, UNEXPECTED_TEXT, true],
  [
    "un error de la base sin convertir",
    { code: "P0001", message: "invalid" },
    "Hay un dato que no es válido. Revísalo y vuelve a intentar.",
    false,
  ],
])("%s también tiene su texto en español y su regla de reintento", (_name, error, text, retryable) => {
  expect(errorMessage(error)).toBe(text);
  expect(isRetryable(error)).toBe(retryable);
});

test("solo se reintenta sin conexión o ante algo inesperado", () => {
  expect(["offline", "unexpected"].map((k) => isRetryable(new AppError(k as "offline")))).toEqual([true, true]);
  expect(
    ["notFound", "forbidden", "invalid", "conflict"].map((k) => isRetryable(new AppError(k as "invalid"))),
  ).toEqual([false, false, false, false]);
});
