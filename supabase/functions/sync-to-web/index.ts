// La copia a la web (docs/spec/products.md §3, fases 8 y 9). La llama la base (pg_net, con el secreto de Vault) al haber
// un cambio y cada minuto si quedó algo. Por cada alfajor: sube su foto si cambió; si todavía no está en la web, busca su
// dirección y lo crea (o lo enlaza, si ya había uno con su nombre); si está, le manda los cambios. Después anota en la
// base lo que pasó. Sin los secretos de Sanity responde not_configured y no toca el outbox
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";

import { json } from "../_shared/respond.ts";
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
} from "../_shared/sanity.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const secret = Deno.env.get("WEB_SYNC_SECRET") ?? "";
const config = {
  projectId: Deno.env.get("SANITY_PROJECT_ID") ?? "",
  dataset: Deno.env.get("SANITY_DATASET") ?? "",
  token: Deno.env.get("SANITY_WRITE_TOKEN") ?? "",
};
const categoryId = Deno.env.get("SANITY_DON_PIPOS_CATEGORY") ?? "";

// Las fotos son privadas: se bajan con la llave secreta de la función (las nuevas de Supabase; si no, la de antes)
function storageKey(): string {
  const keys = Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>);
  return keys[0] ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
const photos = createClient(Deno.env.get("SUPABASE_URL")!, storageKey(), {
  auth: { persistSession: false },
}).storage.from("product-photos");

async function photo(path: string): Promise<Uint8Array> {
  const { data, error } = await photos.download(path);
  if (error || !data) throw new Error(`No se pudo bajar la foto: ${error?.message ?? "vacía"}`);
  return new Uint8Array(await data.arrayBuffer());
}

type Outcome = { error: string | null; result: Record<string, string> | null };
type Linked = (id: string) => Promise<boolean>;

async function syncOne(item: WebSyncItem, linked: Linked): Promise<Outcome> {
  try {
    const result: Record<string, string> = { productId: item.productId };
    let assetId: string | undefined;
    if (item.content?.photoChanged && item.content.photoPath) {
      const name = `${item.slug ?? slugFor(item.content.name ?? "alfajor")}.jpg`;
      const asset = await uploadImage(fetch, config, await photo(item.content.photoPath), name);
      assetId = asset.id;
      result.imageUrl = asset.url;
      result.photoPath = item.content.photoPath;
    }
    if (item.sanityId) {
      const error = await sendMutations(fetch, config, patchMutations(item.sanityId, webFields(item, assetId)));
      return { error, result: error ? null : result };
    }
    if (!item.content?.name) return { error: "Sin contenido para crearlo en la web", result: null };
    if (!categoryId) return { error: "Falta SANITY_DON_PIPOS_CATEGORY (pnpm web connect)", result: null };
    const base = item.slug ?? slugFor(item.content.name);
    const { slug, existingId } = await findSlug(fetch, config, base, item.content.name, linked);
    const mutations = existingId
      ? patchMutations(existingId, webFields(item, assetId))
      : createMutations(item, slug, categoryId, assetId);
    const error = await sendMutations(fetch, config, mutations);
    // «Nuevo» solo si la app creó la página; enlazada a una que ya existía, queda como una del panel
    const created = existingId ? {} : { isNew: "true" };
    return { error, result: error ? null : { ...result, ...created, sanityId: existingId ?? documentId(slug), slug } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), result: null };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!secret || !sameSecret(request.headers.get("x-web-sync-secret") ?? "", secret)) {
    return json(401, { error: "unauthorized" });
  }
  if (!config.projectId || !config.dataset || !config.token) return json(503, { error: "not_configured" });

  // En una transacción: las filas tomadas quedan bloqueadas hasta anotar lo que pasó con cada una
  const summary = await sql.begin(async (tx) => {
    const [row] = await tx`select private.claim_web_sync(20) as items`;
    // Una página que ya es de otro alfajor no se enlaza (ni se le pisa el contenido)
    const linked: Linked = async (id) =>
      (await tx`select exists (select 1 from public.products p where p.sanity_id = ${id}) as taken`)[0]?.taken === true;
    let sent = 0;
    let failed = 0;
    for (const item of (row?.items ?? []) as WebSyncItem[]) {
      const { error, result } = await syncOne(item, linked);
      // tx.json: un texto ya convertido se volvería a convertir, y la base recibiría un texto en vez del objeto
      await tx`select private.finish_web_sync(${item.ids}::bigint[], ${error}, ${result ? tx.json(result) : null}::jsonb)`;
      if (!error) {
        sent += 1;
        continue;
      }
      failed += 1;
      // ponytail: con 10 intentos solo queda en los registros de la función; el aviso por Sentry llega con la APK
      if (item.attempts + 1 >= 10)
        console.error(`sync-to-web: ${item.productId} lleva ${item.attempts + 1} intentos: ${error}`);
    }
    return { sent, failed };
  });
  return json(200, summary);
});
