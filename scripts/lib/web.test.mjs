import assert from "node:assert/strict";
import { test } from "node:test";

import { matchProducts, parseWebArgs } from "./web.mjs";

const BUSINESS = "00000000-0000-4000-8000-0000000000b1";

test("connect pide el dataset de la web y el negocio que se copia", () => {
  assert.deepEqual(parseWebArgs(["connect", "--dataset", "development", "--business", BUSINESS]), {
    command: "connect",
    dataset: "development",
    business: BUSINESS,
  });
  assert.throws(() => parseWebArgs(["connect", "--business", BUSINESS]), /production o development/);
  assert.throws(
    () => parseWebArgs(["connect", "--dataset", "prod", "--business", BUSINESS]),
    /production o development/,
  );
  assert.throws(() => parseWebArgs(["connect", "--dataset", "development"]), /--business/);
  assert.throws(() => parseWebArgs(["connect", "--dataset", "development", "--business", "demo"]), /--business/);
});

test("status no pide nada más, y un comando que no existe muestra el uso", () => {
  assert.deepEqual(parseWebArgs(["status"]), { command: "status" });
  assert.throws(() => parseWebArgs(["link"]), /Uso: pnpm web/);
});

test("cada alfajor de la app se enlaza con su documento de la web por el nombre, sin «Alfajor», «de» ni tildes", () => {
  const app = [
    { id: "p1", name: "Coqueta" },
    { id: "p2", name: "Manteadita" },
    { id: "p3", name: "Limón Kiss" },
    { id: "p4", name: "Tropi" },
  ];
  const docs = [
    {
      _id: "product-don-pipos-alfajor-coqueta",
      name: "Alfajor Coqueta",
      imageUrl: "https://cdn.sanity.io/images/x/coqueta.jpg",
    },
    { _id: "product-don-pipos-alfajor-de-manteadita", name: "Alfajor de Manteadita", imageUrl: null },
    { _id: "product-don-pipos-alfajor-limon-kiss", name: "Alfajor Limon Kiss", imageUrl: null },
    { _id: "product-don-pipos-alfajor-pipo-crush", name: "Alfajor Pipo Crush", imageUrl: null },
  ];
  assert.deepEqual(matchProducts(app, docs), {
    links: [
      {
        productId: "p1",
        name: "Coqueta",
        sanityId: "product-don-pipos-alfajor-coqueta",
        imageUrl: "https://cdn.sanity.io/images/x/coqueta.jpg",
      },
      { productId: "p2", name: "Manteadita", sanityId: "product-don-pipos-alfajor-de-manteadita", imageUrl: null },
      { productId: "p3", name: "Limón Kiss", sanityId: "product-don-pipos-alfajor-limon-kiss", imageUrl: null },
    ],
    missing: ["Tropi"],
    unused: ["Alfajor Pipo Crush"],
  });
});
