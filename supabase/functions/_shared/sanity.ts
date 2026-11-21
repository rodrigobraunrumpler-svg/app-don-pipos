// La copia a la web de un alfajor (docs/spec/products.md §3, fases 8 y 9): su estado (precio, stock, si se ve, orden,
// «Nuevo») y, cuando cambia en la app, su contenido (nombre, descripción, alérgenos, foto). Lo usa sync-to-web; aquí,
// sin Deno, para probarlo con node:test

export type WebState = {
  priceMinor: number;
  isAvailable: boolean;
  isVisible: boolean;
  sortOrder: number;
  isNew: boolean;
};
// Sin nombre ni alérgenos: es uno que nació en el panel, y esos quedan como están allá
export type WebContent = {
  name?: string;
  description?: string;
  allergens?: string[];
  photoPath?: string;
  photoChanged: boolean;
  alt: string;
};
export type WebSyncItem = {
  ids: number[];
  productId: string;
  sanityId: string | null;
  slug: string | null;
  attempts: number;
  payload: WebState;
  content: WebContent | null;
};
export type SanityConfig = { projectId: string; dataset: string; token: string };
type Fields = { set: Record<string, unknown>; unset: string[] };
export type Mutation = Record<string, unknown>;

const API_VERSION = "v2025-02-19";
const api = (config: SanityConfig) => `https://${config.projectId}.api.sanity.io/${API_VERSION}`;
const auth = (config: SanityConfig) => ({ Authorization: `Bearer ${config.token}` });

// «Alfajor Limón Kiss» → «alfajor-limon-kiss»
export function slugFor(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const documentId = (slug: string) => `product-don-pipos-${slug}`;

// Lo que la app manda: el estado siempre; el contenido, si cambió. La descripción solo si la app tiene una, y la foto
// solo si se acaba de subir (con su texto y los derechos: la sube el dueño)
export function webFields(item: WebSyncItem, imageAssetId?: string): Fields {
  const { priceMinor, isAvailable, isVisible, sortOrder, isNew } = item.payload;
  const set: Record<string, unknown> = { priceMinor, isAvailable, isVisible, sortOrder };
  const unset: string[] = [];
  if (isNew) set.badge = "nuevo";
  else unset.push("badge");
  const content = item.content;
  if (content) {
    if (content.name) set.name = content.name;
    if (content.description) set.description = content.description;
    if (content.allergens) set.allergens = content.allergens;
    if (imageAssetId)
      set.image = {
        _type: "image",
        asset: { _type: "reference", _ref: imageAssetId },
        alt: content.alt,
        rightsConfirmed: true,
      };
  }
  return { set, unset };
}

// Al documento y, si alguien lo tiene abierto en Studio, a su borrador: por consulta, que sin borrador no hace nada
export function patchMutations(id: string, fields: Fields): Mutation[] {
  const change = { set: fields.set, ...(fields.unset.length ? { unset: fields.unset } : {}) };
  return [
    { patch: { id, ...change } },
    { patch: { query: "*[_id == $draft]", params: { draft: `drafts.${id}` }, ...change } },
  ];
}

// Un alfajor que todavía no está en la web: el documento completo, en la categoría de Don Pipos
export function createMutations(
  item: WebSyncItem,
  slug: string,
  categoryId: string,
  imageAssetId?: string,
): Mutation[] {
  return [
    {
      createIfNotExists: {
        _id: documentId(slug),
        _type: "product",
        brand: "don-pipos",
        slug: { _type: "slug", current: slug },
        category: { _type: "reference", _ref: categoryId },
        ...webFields(item, imageAssetId).set,
        // Recién creado siempre es «Nuevo»: la base anota desde cuándo al terminar
        badge: "nuevo",
      },
    },
  ];
}

// La dirección para un alfajor nuevo: libre, se usa; ocupada por uno con el mismo nombre, es el mismo alfajor (se
// enlaza, no se duplica: también después de un corte a medias), salvo que esa página ya sea de otro alfajor de la app
// (`linked`: uno renombrado cuyo nombre nuevo todavía no llegó). Si ese alfajor solo existe como borrador de Studio, se
// crea la página publicada con esa dirección. Ocupada por otro, se prueba con -2, -3…
export async function findSlug(
  fetchFn: typeof fetch,
  config: SanityConfig,
  base: string,
  name: string,
  linked: (id: string) => Promise<boolean> = async () => false,
): Promise<{ slug: string; existingId: string | null }> {
  const query = '*[_type == "product" && (slug.current == $slug || _id in [$id, "drafts." + $id])]{_id, name}';
  for (let n = 1; n <= 20; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const params = `&$slug=${encodeURIComponent(JSON.stringify(slug))}&$id=${encodeURIComponent(JSON.stringify(documentId(slug)))}`;
    const response = await fetchFn(
      `${api(config)}/data/query/${config.dataset}?perspective=raw&query=${encodeURIComponent(query)}${params}`,
      { headers: auth(config), signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const docs = ((await response.json()) as { result?: { _id: string; name?: string }[] }).result ?? [];
    if (docs.length === 0) return { slug, existingId: null };
    const same = docs.find((doc) => doc.name === name);
    const id = same?._id.replace(/^drafts\./, "");
    if (id && !(await linked(id))) return { slug, existingId: docs.some((doc) => doc._id === id) ? id : null };
  }
  throw new Error(`No hay una dirección libre para «${name}»`);
}

// Sube la foto a Sanity. Vuelve el asset (para la foto del documento) y su dirección en el CDN (para la app)
export async function uploadImage(
  fetchFn: typeof fetch,
  config: SanityConfig,
  bytes: Uint8Array,
  filename: string,
): Promise<{ id: string; url: string }> {
  const response = await fetchFn(
    `${api(config)}/assets/images/${config.dataset}?filename=${encodeURIComponent(filename)}`,
    {
      method: "POST",
      headers: { ...auth(config), "Content-Type": "image/jpeg" },
      // Los tipos de DOM no aceptan un Uint8Array como cuerpo, aunque fetch sí
      body: bytes as unknown as BodyInit,
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const { document } = (await response.json()) as { document: { _id: string; url: string } };
  return { id: document._id, url: document.url };
}

// Manda las mutaciones juntas (Sanity las aplica todas o ninguna), con 10 segundos de límite. null si salió bien; si
// no, el error recortado, que queda en el outbox para el próximo intento
export async function sendMutations(
  fetchFn: typeof fetch,
  config: SanityConfig,
  mutations: Mutation[],
): Promise<string | null> {
  try {
    const response = await fetchFn(`${api(config)}/data/mutate/${config.dataset}`, {
      method: "POST",
      headers: { ...auth(config), "Content-Type": "application/json" },
      body: JSON.stringify({ mutations }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      await response.body?.cancel();
      return null;
    }
    return `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// El secreto con que la base llama a la función, comparado sin cortar al primer carácter distinto
export function sameSecret(given: string, expected: string): boolean {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let index = 0; index < b.length; index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}
