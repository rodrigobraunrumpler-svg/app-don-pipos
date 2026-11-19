import { fillTemplate } from "./fill";

test("reemplaza los marcadores", () =>
  expect(
    fillTemplate("Hola {nombre}, tu pedido {numero} va en camino. Total a pagar: {falta} ({pago}).", {
      nombre: "Ana",
      numero: "#0042",
      falta: "S/ 42.00",
      pago: "Yape, Plin, transferencia o efectivo",
    }),
  ).toBe("Hola Ana, tu pedido #0042 va en camino. Total a pagar: S/ 42.00 (Yape, Plin, transferencia o efectivo)."));

test("un marcador sin valor desaparece, sin dejar espacios de más", () =>
  expect(
    fillTemplate("Hola {nombre}. {adelanto} {entrega} ¡Gracias!", {
      nombre: "Ana",
      entrega: "Te avisamos cuando salga.",
    }),
  ).toBe("Hola Ana. Te avisamos cuando salga. ¡Gracias!"));

test("un marcador que no existe queda como está", () =>
  expect(fillTemplate("Hola {apodo}", { nombre: "Ana" })).toBe("Hola {apodo}"));
