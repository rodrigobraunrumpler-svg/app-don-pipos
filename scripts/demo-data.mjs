// Carga los alfajores DEMO en el negocio del dueño DEMO del proyecto de desarrollo: pnpm demo:data
// Llama a las funciones de la app como ese dueño (como tests.login_as). Correrlo otra vez no duplica nada:
// crea solo los productos que faltan, y cuenta el stock DEMO solo si todo el stock está en 0.
import { randomUUID } from "node:crypto";

import { DEMO_CATALOG } from "./lib/demo-catalog.mjs";
import { connect } from "./lib/db.mjs";

const client = await connect().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

try {
  const phone = process.env.DEMO_OWNER_PHONE;
  if (!phone) throw new Error("Falta DEMO_OWNER_PHONE en .env.local (pnpm owner create --demo)");
  const { rows } = await client.query("select user_id from private.pin_credentials where phone = $1", [phone]);
  if (rows.length === 0)
    throw new Error("El dueño DEMO no existe en el proyecto de desarrollo (pnpm owner create --demo)");

  await client.query("begin");
  await client.query(
    "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
    [rows[0].user_id],
  );
  await client.query("set local role authenticated");

  const existing = (await client.query("select public.list_products() as list")).rows[0].list;
  const names = new Set(existing.map((product) => product.name.toLowerCase()));
  const missing = DEMO_CATALOG.filter((product) => !names.has(product.name.toLowerCase()));
  for (const product of missing) {
    await client.query("select public.save_product(null, null, $1, $2, null, $3, true)", [
      product.name,
      product.priceCents,
      product.minStock,
    ]);
  }

  const overview = (await client.query("select public.stock_overview() as list")).rows[0].list;
  const counts = DEMO_CATALOG.map((product) => ({
    productId: overview.find((item) => item.name.toLowerCase() === product.name.toLowerCase())?.productId,
    counted: product.stock,
  })).filter((count) => count.productId);
  const countStock = overview.every((item) => item.onHand === 0) && counts.some((count) => count.counted > 0);
  if (countStock) {
    await client.query("select public.register_stock_count($1, $2::jsonb)", [randomUUID(), JSON.stringify(counts)]);
  }
  await client.query("commit");

  if (missing.length === 0 && !countStock) console.log("Nada que hacer: los alfajores DEMO ya están.");
  else console.log(`${missing.length} productos creados${countStock ? " y el stock DEMO contado" : ""}.`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
