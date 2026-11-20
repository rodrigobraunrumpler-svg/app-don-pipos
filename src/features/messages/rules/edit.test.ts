import { insertPlaceholder, templateProblem } from "./edit";

test("un marcador se inserta donde está el cursor (o reemplaza lo elegido), y el cursor queda después", () => {
  expect(insertPlaceholder("Hola , tu pedido", { start: 5, end: 5 }, "nombre")).toEqual({
    body: "Hola {nombre}, tu pedido",
    cursor: 13,
  });
  expect(insertPlaceholder("Hola Ana", { start: 5, end: 8 }, "nombre")).toEqual({ body: "Hola {nombre}", cursor: 13 });
});

test("lo que impide guardar un mensaje, con el mismo criterio que la base", () => {
  expect(templateProblem("on_the_way", "Hola {nombre}, va en camino. {pago}")).toBeNull();
  expect(templateProblem("on_the_way", "   ")).toBe("El mensaje no puede quedar vacío.");
  expect(templateProblem("on_the_way", "a".repeat(501))).toBe("El mensaje va hasta 500 letras.");
  expect(templateProblem("on_the_way", "Llevas {sellos}")).toBe("«{sellos}» no se puede usar en este mensaje.");
  expect(templateProblem("we_miss_you", "{precio} y {total}")).toBe(
    "«{precio}» y «{total}» no se pueden usar en este mensaje.",
  );
});
