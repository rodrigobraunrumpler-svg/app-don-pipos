import { TEST_PRODUCTS } from "@/test/products";

import type { Product } from "../schema/product";
import { draftFrom, inputFrom } from "./product-draft";

test("un alfajor que guardó una versión anterior de la app (sin alérgenos) se abre igual", () => {
  const old = { ...TEST_PRODUCTS[0]!, allergens: undefined } as unknown as Product;
  expect(draftFrom(old).allergens).toEqual([]);
});

test("uno que ya se ve en la web sigue viéndose al guardarlo, aunque su foto todavía esté subiendo", () => {
  const fresh = { ...TEST_PRODUCTS[0]!, showOnWeb: true, hasPhoto: false, imageUrl: null, description: "Frutos rojos" };
  const result = inputFrom(draftFrom(fresh), true);
  expect("input" in result && result.input.showOnWeb).toBe(true);
});

test("pero uno que no se veía no se prende sin foto", () => {
  const hidden = {
    ...TEST_PRODUCTS[0]!,
    showOnWeb: false,
    hasPhoto: false,
    imageUrl: null,
    description: "Frutos rojos",
  };
  const result = inputFrom(draftFrom(hidden), true);
  expect("input" in result && result.input.showOnWeb).toBe(false);
});
