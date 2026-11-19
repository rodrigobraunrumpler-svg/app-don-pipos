import { formatPhone, normalizePhone } from "./phone";

test.each(["987 654 321", "+51 987-654-321", "51987654321", "(987) 654.321"])("«%s» → +51987654321", (text) =>
  expect(normalizePhone(text)).toBe("+51987654321"),
);
test.each(["98765432", "9876543210", "98765432a", "", "+52 987654321"])("«%s» no es un celular de Perú", (text) =>
  expect(normalizePhone(text)).toBeNull(),
);
test("«987 654 321» para mostrar", () => expect(formatPhone("+51987654321")).toBe("987 654 321"));
