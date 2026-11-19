import { hashPin, pinMatches } from "./local-pin";

test("el mismo PIN coincide y otro no", async () => {
  const stored = await hashPin("197346");
  expect(await pinMatches("197346", stored)).toBe(true);
  expect(await pinMatches("197347", stored)).toBe(false);
});

test("dos hashes del mismo PIN tienen sales distintas", async () => {
  const first = await hashPin("197346");
  const second = await hashPin("197346");
  expect(first.salt).not.toBe(second.salt);
  expect(first.hash).not.toBe(second.hash);
});

test("con la misma sal da el mismo hash", async () => {
  const stored = await hashPin("197346");
  expect(await hashPin("197346", stored.salt)).toEqual(stored);
});
