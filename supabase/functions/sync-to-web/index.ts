// La copia a la web (docs/spec/products.md §3, fase 8). La llama la base (pg_net, con el secreto de Vault) al haber un
// cambio y cada minuto si quedó algo: toma lo más nuevo de cada alfajor, lo manda a Sanity y anota lo que pasó. Sin los
// secretos de Sanity responde not_configured y no toca el outbox
import postgres from "npm:postgres@3";

import { json } from "../_shared/respond.ts";
import { sameSecret, sendToSanity, type WebSyncItem } from "../_shared/sanity.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const secret = Deno.env.get("WEB_SYNC_SECRET") ?? "";
const config = {
  projectId: Deno.env.get("SANITY_PROJECT_ID") ?? "",
  dataset: Deno.env.get("SANITY_DATASET") ?? "",
  token: Deno.env.get("SANITY_WRITE_TOKEN") ?? "",
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!secret || !sameSecret(request.headers.get("x-web-sync-secret") ?? "", secret)) {
    return json(401, { error: "unauthorized" });
  }
  if (!config.projectId || !config.dataset || !config.token) return json(503, { error: "not_configured" });

  // En una transacción: las filas tomadas quedan bloqueadas hasta anotar lo que pasó con cada una
  const result = await sql.begin(async (tx) => {
    const [row] = await tx`select private.claim_web_sync(20) as items`;
    let sent = 0;
    let failed = 0;
    for (const item of (row?.items ?? []) as WebSyncItem[]) {
      const error = await sendToSanity(fetch, config, item);
      await tx`select private.finish_web_sync(${item.ids}::bigint[], ${error})`;
      if (!error) {
        sent += 1;
        continue;
      }
      failed += 1;
      // ponytail: con 10 intentos solo queda en los registros de la función; el aviso por Sentry llega con la parte 2
      if (item.attempts + 1 >= 10)
        console.error(`sync-to-web: ${item.sanityId} lleva ${item.attempts + 1} intentos: ${error}`);
    }
    return { sent, failed };
  });
  return json(200, result);
});
