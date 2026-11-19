import { waLink } from "./whatsapp";

test("el enlace de WhatsApp codifica la ñ, las tildes y los saltos de línea", () =>
  expect(waLink("+51987654321", "Hola, ñandú\n¿listo?")).toBe(
    "https://wa.me/51987654321?text=Hola%2C%20%C3%B1and%C3%BA%0A%C2%BFlisto%3F",
  ));
