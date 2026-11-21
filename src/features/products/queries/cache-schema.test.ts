import { CACHE_SCHEMA } from "@/lib/query";

import { productSchema } from "../schema/product";

// La lista de alfajores se guarda en el celular: si cambia su forma, CACHE_SCHEMA sube y lo guardado antes se descarta
// (una lista vieja sin `allergens` rompía Editar)
test("la forma guardada de un alfajor va con su número de esquema", () => {
  expect({ schema: CACHE_SCHEMA, fields: Object.keys(productSchema.shape).sort() }).toEqual({
    schema: 6,
    fields: [
      "allergens",
      "costCents",
      "description",
      "hasPhoto",
      "id",
      "imageUrl",
      "isActive",
      "isNew",
      "linkedToWeb",
      "minStock",
      "name",
      "priceCents",
      "showOnWeb",
      "sortOrder",
      "version",
      "webSlug",
      "webState",
    ],
  });
});
