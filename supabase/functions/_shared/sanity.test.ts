import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createMutations,
  documentId,
  findSlug,
  patchMutations,
  sameSecret,
  sendMutations,
  slugFor,
  uploadImage,
  webFields,
  type WebSyncItem,
} from "./sanity.ts";

const CONFIG = { projectId: "abc123", dataset: "development", token: "token-de-prueba" };
const STATE = { priceMinor: 1300, isAvailable: true, isVisible: true, sortOrder: 20, isNew: false };
const CONTENT = {
  name: "Alfajor Tropi",
  description: "Relleno de frutas tropicales",
  allergens: ["gluten", "lacteos"],
  photoPath: "b1/p2/f1.jpg",
  photoChanged: true,
  alt: "Alfajor Tropi de Don Pipos",
};
const item = (over: Partial<WebSyncItem> = {}): WebSyncItem => ({
  ids: [7, 9],
  productId: "p2",
  sanityId: "product-don-pipos-alfajor-tropi",
  slug: "alfajor-tropi",
  attempts: 0,
  payload: STATE,
  content: null,
  ...over,
});
const IMAGE = {
  _type: "image",
  asset: { _type: "reference", _ref: "image-abc-1024x1024-jpg" },
  alt: "Alfajor Tropi de Don Pipos",
  rightsConfirmed: true,
};
// Un fetch de mentira que anota cada llamada y responde lo que se le pida
function fakeFetch(...responses: (Response | Error)[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next ?? new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

test("la dirección en la web sale del nombre: sin tildes ni signos, con guiones", () => {
  assert.equal(slugFor("Alfajor Limón Kiss"), "alfajor-limon-kiss");
  assert.equal(slugFor("  Alfajor   Pipo Crush! "), "alfajor-pipo-crush");
  assert.equal(slugFor("Alfajor de Manteadita"), "alfajor-de-manteadita");
  assert.equal(documentId("alfajor-tropi"), "product-don-pipos-alfajor-tropi");
});

test("un cambio de estado manda precio, stock, si se ve y el orden; sin «Nuevo», la etiqueta se quita", () => {
  assert.deepEqual(webFields(item()), {
    set: { priceMinor: 1300, isAvailable: true, isVisible: true, sortOrder: 20 },
    unset: ["badge"],
  });
  assert.deepEqual(webFields(item({ payload: { ...STATE, isNew: true } })).set.badge, "nuevo");
  assert.deepEqual(webFields(item({ payload: { ...STATE, isNew: true } })).unset, []);
});

test("con contenido, también el nombre, la descripción, los alérgenos y la foto nueva con su texto y sus derechos", () => {
  const fields = webFields(item({ content: CONTENT }), "image-abc-1024x1024-jpg");
  assert.equal(fields.set.name, "Alfajor Tropi");
  assert.equal(fields.set.description, "Relleno de frutas tropicales");
  assert.deepEqual(fields.set.allergens, ["gluten", "lacteos"]);
  assert.deepEqual(fields.set.image, IMAGE);
  const { description, ...withoutDescription } = CONTENT;
  assert.ok(description);
  assert.equal(
    "description" in webFields(item({ content: withoutDescription })).set,
    false,
    "sin descripción en la app, no se pisa la del panel",
  );
  assert.equal("image" in webFields(item({ content: CONTENT })).set, false, "sin foto subida, la foto no se toca");
});

test("el cambio va al documento y, si alguien lo tiene abierto en Studio, a su borrador", () => {
  const fields = { set: { priceMinor: 1300 }, unset: ["badge"] };
  assert.deepEqual(patchMutations("product-don-pipos-alfajor-tropi", fields), [
    { patch: { id: "product-don-pipos-alfajor-tropi", set: { priceMinor: 1300 }, unset: ["badge"] } },
    {
      patch: {
        query: "*[_id == $draft]",
        params: { draft: "drafts.product-don-pipos-alfajor-tropi" },
        set: { priceMinor: 1300 },
        unset: ["badge"],
      },
    },
  ]);
});

test("un alfajor nuevo se crea con su marca, su categoría, su dirección, su foto y la etiqueta «Nuevo»", () => {
  // Recién creado siempre es «Nuevo», aunque la base todavía no sepa desde cuándo sale en la web
  const nuevo = item({ sanityId: null, slug: null, content: CONTENT, payload: { ...STATE, isNew: false } });
  assert.deepEqual(createMutations(nuevo, "alfajor-tropi", "category-don-pipos-alfajores", "image-abc-1024x1024-jpg"), [
    {
      createIfNotExists: {
        _id: "product-don-pipos-alfajor-tropi",
        _type: "product",
        brand: "don-pipos",
        slug: { _type: "slug", current: "alfajor-tropi" },
        category: { _type: "reference", _ref: "category-don-pipos-alfajores" },
        priceMinor: 1300,
        isAvailable: true,
        isVisible: true,
        sortOrder: 20,
        badge: "nuevo",
        name: "Alfajor Tropi",
        description: "Relleno de frutas tropicales",
        allergens: ["gluten", "lacteos"],
        image: IMAGE,
      },
    },
  ]);
});

test("la foto se sube a Sanity con su nombre, y vuelve su asset; un error vuelve con su código", async () => {
  const ok = fakeFetch(
    new Response(
      JSON.stringify({ document: { _id: "image-abc-1024x1024-jpg", url: "https://cdn.sanity.io/images/x/tropi.jpg" } }),
    ),
  );
  const bytes = new Uint8Array([1, 2, 3]);
  assert.deepEqual(await uploadImage(ok.fn, CONFIG, bytes, "alfajor-tropi.jpg"), {
    id: "image-abc-1024x1024-jpg",
    url: "https://cdn.sanity.io/images/x/tropi.jpg",
  });
  assert.equal(
    ok.calls[0]?.url,
    "https://abc123.api.sanity.io/v2025-02-19/assets/images/development?filename=alfajor-tropi.jpg",
  );
  assert.equal((ok.calls[0]?.init.headers as Record<string, string>)["Content-Type"], "image/jpeg");
  assert.equal(ok.calls[0]?.init.body, bytes);
  const bad = fakeFetch(new Response("no autorizado", { status: 401 }));
  await assert.rejects(uploadImage(bad.fn, CONFIG, bytes, "x.jpg"), /HTTP 401: no autorizado/);
});

test("la dirección: libre se usa; con el mismo nombre es el mismo alfajor (no se duplica); con otro, la siguiente", async () => {
  const free = fakeFetch(new Response(JSON.stringify({ result: [] })));
  assert.deepEqual(await findSlug(free.fn, CONFIG, "alfajor-tropi", "Alfajor Tropi"), {
    slug: "alfajor-tropi",
    existingId: null,
  });
  assert.match(free.calls[0]?.url ?? "", /perspective=raw/);
  const same = fakeFetch(new Response(JSON.stringify({ result: [{ _id: "abc", name: "Alfajor Tropi" }] })));
  assert.deepEqual(await findSlug(same.fn, CONFIG, "alfajor-tropi", "Alfajor Tropi"), {
    slug: "alfajor-tropi",
    existingId: "abc",
  });
  const other = fakeFetch(
    new Response(JSON.stringify({ result: [{ _id: "zzz", name: "Alfajor Tropical" }] })),
    new Response(JSON.stringify({ result: [] })),
  );
  assert.deepEqual(await findSlug(other.fn, CONFIG, "alfajor-tropi", "Alfajor Tropi"), {
    slug: "alfajor-tropi-2",
    existingId: null,
  });
  const draft = fakeFetch(new Response(JSON.stringify({ result: [{ _id: "drafts.abc", name: "Alfajor Tropi" }] })));
  assert.deepEqual(await findSlug(draft.fn, CONFIG, "alfajor-tropi", "Alfajor Tropi"), {
    slug: "alfajor-tropi",
    existingId: "abc",
  });
});

test("mandar las mutaciones: un 2xx sale bien; un error vuelve con su código y recortado; uno de red, con su mensaje", async () => {
  const ok = fakeFetch(new Response('{"transactionId":"t1"}'));
  assert.equal(await sendMutations(ok.fn, CONFIG, [{ patch: { id: "x", set: {} } }]), null);
  assert.equal(ok.calls[0]?.url, "https://abc123.api.sanity.io/v2025-02-19/data/mutate/development");
  assert.equal((ok.calls[0]?.init.headers as Record<string, string>).Authorization, "Bearer token-de-prueba");
  const bad = fakeFetch(new Response("x".repeat(1000), { status: 409 }));
  const error = await sendMutations(bad.fn, CONFIG, []);
  assert.match(error ?? "", /^HTTP 409: x+$/);
  assert.ok((error ?? "").length <= "HTTP 409: ".length + 300);
  const down = fakeFetch(new TypeError("fetch failed"));
  assert.equal(await sendMutations(down.fn, CONFIG, []), "fetch failed");
});

test("el secreto se compara entero: igual pasa; otro, o de otro largo, no", () => {
  assert.equal(sameSecret("s3creto-largo", "s3creto-largo"), true);
  assert.equal(sameSecret("s3creto-largo", "s3creto-larga"), false);
  assert.equal(sameSecret("s3creto", "s3creto-largo"), false);
});
