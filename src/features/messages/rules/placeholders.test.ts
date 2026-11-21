import { PLACEHOLDERS, unknownPlaceholders } from "./placeholders";

test("qué marcadores vale cada plantilla", () => {
  expect(PLACEHOLDERS.confirmation).toEqual(["nombre", "numero", "detalle", "total", "adelanto", "entrega"]);
  expect(PLACEHOLDERS.we_miss_you).toEqual(["nombre"]);
});
test("los que no valen", () => {
  expect(unknownPlaceholders("on_the_way", "Hola {nombre}, {apodo} y {sellos}")).toEqual(["apodo", "sellos"]);
  expect(unknownPlaceholders("delivered", "¡Gracias, {nombre}! {sellos}")).toEqual([]);
});

test("«Pedir reseña» vale el nombre y el enlace de Google (fase 9)", () => {
  expect(PLACEHOLDERS.ask_review).toEqual(["nombre", "enlace"]);
  expect(unknownPlaceholders("ask_review", "Hola {nombre}, {numero}: {enlace}")).toEqual(["numero"]);
});
