// La copia a la web (docs/spec/products.md §3), para el equipo. Hoy solo contra el proyecto de Supabase de siempre.
//   pnpm web connect --dataset <production|development> --business <id del negocio>
//     Enciende la copia: los secretos de sync-to-web, la URL, el secreto y el negocio en Vault, y enlaza cada alfajor
//     del negocio con su documento de la web, por el nombre. Se puede repetir: cambia el secreto y vuelve a enlazar.
//   pnpm web status
//     Lo pendiente, los últimos errores y las últimas respuestas de la función.
// Necesita en .env.local SANITY_WRITE_TOKEN (permiso Editor) y SANITY_PROJECT_ID. Nunca imprime secretos.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { connect } from "./lib/db.mjs";
import { loadEnv, ROOT } from "./lib/guard.mjs";
import { connectProblem, matchProducts, missingNote, parseWebArgs } from "./lib/web.mjs";

const DOCS =
  '*[_type == "product" && brand == "don-pipos"]{_id, name, "slug": slug.current, "imageUrl": image.asset->url}';
const CATEGORY = '*[_type == "category" && brand == "don-pipos"] | order(sortOrder asc)[0]._id';

function required(name) {
  if (!process.env[name]) throw new Error(`Falta ${name} en .env.local`);
  return process.env[name];
}

async function sanityQuery(projectId, dataset, token, query) {
  const url = `https://${projectId}.api.sanity.io/v2025-02-19/data/query/${dataset}?perspective=published&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Sanity respondió ${response.status} al leer ${dataset}`);
  return (await response.json()).result;
}

// Los secretos de la función viajan en un archivo temporal que solo tiene esas líneas, y que se borra pase lo que pase
function setFunctionSecrets(values) {
  const dir = mkdtempSync(join(tmpdir(), "secretos-"));
  try {
    const file = join(dir, "web.env");
    writeFileSync(
      file,
      Object.entries(values)
        .map(([name, value]) => `${name}=${value}\n`)
        .join(""),
      { mode: 0o600 },
    );
    const run = spawnSync(
      process.execPath,
      [join(ROOT, "scripts", "supabase.mjs"), "secrets", "set", "--env-file", file, "--yes"],
      {
        stdio: ["ignore", "ignore", "inherit"],
      },
    );
    if (run.status !== 0) throw new Error("No se pudieron guardar los secretos de la función");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function connectWeb(client, { dataset, business }) {
  const projectId = required("SANITY_PROJECT_ID");
  const token = required("SANITY_WRITE_TOKEN");
  const found = await client.query("select name from public.businesses where id = $1", [business]);
  if (!found.rows[0]) throw new Error(`No hay un negocio con el id ${business}`);
  const products = (
    await client.query(
      "select id, name from public.products where business_id = $1 and is_active order by sort_order",
      [business],
    )
  ).rows;
  const { links, missing, unused } = matchProducts(
    products,
    (await sanityQuery(projectId, dataset, token, DOCS)) ?? [],
  );
  const problem = connectProblem({ links, unused });
  if (problem) throw new Error(problem);
  // La categoría de los alfajores nuevos que la app crea en la web
  const category = await sanityQuery(projectId, dataset, token, CATEGORY);
  if (!category) throw new Error(`No hay una categoría de Don Pipos en Sanity ${dataset}`);

  const secret = randomBytes(32).toString("base64url");
  setFunctionSecrets({
    WEB_SYNC_SECRET: secret,
    SANITY_PROJECT_ID: projectId,
    SANITY_DATASET: dataset,
    SANITY_WRITE_TOKEN: token,
    SANITY_DON_PIPOS_CATEGORY: category,
  });
  // En una transacción: Vault primero, así el aviso de los enlaces ya encuentra la URL y el secreto
  const vault = {
    web_sync_url: `${required("EXPO_PUBLIC_SUPABASE_URL")}/functions/v1/sync-to-web`,
    web_sync_secret: secret,
    web_sync_business_id: business,
  };
  await client.query("begin");
  try {
    for (const [name, value] of Object.entries(vault)) {
      await client.query("delete from vault.secrets where name = $1", [name]);
      await client.query("select vault.create_secret($1, $2)", [value, name]);
    }
    for (const link of links) {
      await client.query("select private.link_product($1, $2, $3, $4)", [
        link.productId,
        link.sanityId,
        link.imageUrl,
        link.slug,
      ]);
    }
    // Los que la app creó y ya están completos (foto y descripción) pero todavía no están en la web: la copia los crea
    await client.query(
      `select private.queue_web_sync(p.id, 'content') from public.products p
       where p.business_id = $1 and p.sanity_id is null and p.show_on_web and p.is_active
         and p.description is not null and p.photo_path is not null`,
      [business],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
  console.log(`Copia encendida: «${found.rows[0].name}» → Sanity ${dataset}.`);
  for (const link of links) console.log(`  ${link.name} → ${link.sanityId}${link.imageUrl ? " (con foto)" : ""}`);
  const note = missingNote(missing);
  if (note) console.log(note);
  if (unused.length) console.log(`En la web, sin alfajor en la app: ${unused.join(", ")}`);
}

async function status(client) {
  const business = (await client.query("select private.web_sync_business() as id")).rows[0].id;
  if (!business) {
    console.log("La copia a la web está apagada: no hay negocio en Vault (pnpm web connect).");
    return;
  }
  const counts = (
    await client.query(
      `select count(*) filter (where sent_at is null) as pending,
         count(*) filter (where sent_at > now() - interval '1 hour' and last_error is null) as sent_last_hour,
         max(attempts) filter (where sent_at is null) as max_attempts
       from private.web_sync_outbox where business_id = $1`,
      [business],
    )
  ).rows[0];
  console.log(
    `Pendientes: ${counts.pending} (hasta ${counts.max_attempts ?? 0} intentos). Enviados en la última hora: ${counts.sent_last_hour}.`,
  );
  const errors = await client.query(
    "select last_error, attempts from private.web_sync_outbox where business_id = $1 and sent_at is null and last_error is not null order by id desc limit 3",
    [business],
  );
  for (const row of errors.rows) console.log(`  error (${row.attempts} intentos): ${row.last_error}`);
  const responses = await client.query(
    "select status_code, timed_out, left(coalesce(error_msg, content), 120) as detail, created from net._http_response order by created desc limit 5",
  );
  console.log("Últimas respuestas de la función:");
  for (const row of responses.rows)
    console.log(
      `  ${row.created.toISOString()} · ${row.timed_out ? "sin respuesta" : row.status_code} · ${row.detail ?? ""}`,
    );
}

loadEnv();
let args;
try {
  args = parseWebArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const client = await connect();
try {
  if (args.command === "connect") await connectWeb(client, args);
  else await status(client);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
