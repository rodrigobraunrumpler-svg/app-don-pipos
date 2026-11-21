import assert from "node:assert/strict";
import { test } from "node:test";

import { sameSecret, sanityMutation, sendToSanity, type WebSyncItem } from "./sanity.ts";

const ITEM: WebSyncItem = {
  ids: [7, 9],
  sanityId: "producto-coqueta-demo",
  attempts: 0,
  payload: { priceMinor: 1300, isAvailable: true, isVisible: true },
};
const CONFIG = { projectId: "abc123", dataset: "development", token: "token-de-prueba" };

test("la mutación cambia solo el precio, si está disponible y si se ve, en el documento y en su borrador de Studio", () => {
  const set = { priceMinor: 1300, isAvailable: true, isVisible: true };
  assert.deepEqual(sanityMutation(ITEM), {
    mutations: [
      { patch: { id: "producto-coqueta-demo", set } },
      // Por consulta: si no hay borrador no hace nada; si lo hay, publicarlo no devuelve el precio viejo
      { patch: { query: "*[_id == $draft]", params: { draft: "drafts.producto-coqueta-demo" }, set } },
    ],
  });
});

test("manda la mutación a la API de Sanity del dataset, con el token, y sale bien con un 2xx", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response('{"transactionId":"t1"}', { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await sendToSanity(fakeFetch, CONFIG, ITEM), null);
  assert.equal(calls[0]?.url, "https://abc123.api.sanity.io/v2025-02-19/data/mutate/development");
  assert.equal(calls[0]?.init.method, "POST");
  assert.equal((calls[0]?.init.headers as Record<string, string>).Authorization, "Bearer token-de-prueba");
  assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), sanityMutation(ITEM));
});

test("una respuesta de error vuelve como texto con su código, recortado", async () => {
  const fakeFetch = (async () => new Response("x".repeat(1000), { status: 401 })) as unknown as typeof fetch;
  const error = await sendToSanity(fakeFetch, CONFIG, ITEM);
  assert.match(error ?? "", /^HTTP 401: x+$/);
  assert.ok((error ?? "").length <= "HTTP 401: ".length + 300);
});

test("un error de red vuelve como texto", async () => {
  const fakeFetch = (async () => {
    throw new TypeError("fetch failed");
  }) as unknown as typeof fetch;
  assert.equal(await sendToSanity(fakeFetch, CONFIG, ITEM), "fetch failed");
});

test("el secreto se compara entero: igual pasa; otro, o de otro largo, no", () => {
  assert.equal(sameSecret("s3creto-largo", "s3creto-largo"), true);
  assert.equal(sameSecret("s3creto-largo", "s3creto-larga"), false);
  assert.equal(sameSecret("s3creto", "s3creto-largo"), false);
});
