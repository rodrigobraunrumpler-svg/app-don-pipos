import { ordersText, profitText, rankBy, unitsText } from "./ranking";

const product = (
  name: string,
  units: number,
  salesCents: number,
  costCents: number | null,
  profitCents: number | null,
) => ({
  productId: name,
  name,
  imageUrl: null,
  units,
  salesCents,
  costCents,
  profitCents,
});

test("los más vendidos primero, en unidades o en soles, y por nombre si empatan", () => {
  const products = [
    product("Pipo Crush", 5, 6500, null, null),
    product("Coqueta", 5, 6000, 500, 3500),
    product("Limon Kiss", 1, 1200, 600, 600),
  ];
  expect(rankBy(products, "units").map((item) => item.name)).toEqual(["Coqueta", "Pipo Crush", "Limon Kiss"]);
  expect(rankBy(products, "soles").map((item) => item.name)).toEqual(["Pipo Crush", "Coqueta", "Limon Kiss"]);
});

test("unidades, pedidos y la ganancia de cada alfajor en palabras", () => {
  expect([unitsText(1), unitsText(5), ordersText(1), ordersText(0)]).toEqual([
    "1 unidad",
    "5 unidades",
    "1 pedido",
    "0 pedidos",
  ]);
  expect(profitText(product("Coqueta", 5, 6000, 500, 3500))).toBe("Gana S/ 7.00 por alfajor (cuesta S/ 5.00)");
  // Con el costo guardado en cada venta, aunque hoy ya no tenga costo
  expect(profitText(product("Coqueta", 5, 6000, null, 3500))).toBe("Gana S/ 7.00 por alfajor");
  expect(profitText(product("Pipo Crush", 5, 6500, null, null))).toBe("Sin costo: ponlo en Productos");
});
