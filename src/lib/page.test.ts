import { z } from "zod";

import { pageSchema } from "./page";

const schema = pageSchema(z.object({ id: z.string() }));

test("una página trae sus filas y cómo seguir", () => {
  const page = { items: [{ id: "a" }], meta: { limit: 20, total: 21, hasMore: true, nextCursor: "MjAy" } };
  expect(schema.parse(page)).toEqual(page);
});

test("sin «meta» no es una página", () => {
  expect(schema.safeParse({ items: [] }).success).toBe(false);
});
