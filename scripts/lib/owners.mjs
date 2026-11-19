// Crear y borrar dueños en el proyecto de desarrollo: la cuenta (API de administración), su PIN y su negocio.
// Lo usan la prueba de las funciones (pnpm test:auth) y los scripts del equipo (pnpm owner).
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { ownerPassword } from "../../supabase/functions/_shared/owner-password.ts";
import { connect } from "./db.mjs";
import { assertDevProject, loadEnv } from "./guard.mjs";

function settings() {
  loadEnv();
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const passwordSecret = process.env.AUTH_PASSWORD_SECRET;
  if (!url || !secretKey) throw new Error("Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  if (!passwordSecret) throw new Error("Falta AUTH_PASSWORD_SECRET en .env.local: corre pnpm functions:deploy");
  // La API de administración solo se usa con el proyecto de desarrollo
  assertDevProject(new URL(url).hostname.split(".")[0], process.env.SUPABASE_DEV_PROJECT_REF, "Crear o borrar dueños");
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { admin, passwordSecret };
}

/** Crea la cuenta, guarda el PIN y crea el negocio. Si algo falla, borra lo que alcanzó a crear. */
export async function createOwner({ phone, business, modules = [], pin }) {
  const { admin, passwordSecret } = settings();
  const { data, error } = await admin.auth.admin.createUser({
    email: `dueno-${randomBytes(4).toString("hex")}@cuentas.invalid`,
    password: randomBytes(36).toString("base64url"),
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear la cuenta: ${error.message}`);
  const userId = data.user.id;

  const client = await connect();
  try {
    const updated = await admin.auth.admin.updateUserById(userId, {
      password: await ownerPassword(userId, passwordSecret),
    });
    if (updated.error) throw new Error(`No se pudo poner la contraseña interna: ${updated.error.message}`);
    await client.query("begin");
    await client.query("select private.set_pin($1, $2, $3)", [userId, phone, pin]);
    const { rows } = await client.query(
      "insert into public.businesses (owner_id, name, modules) values ($1, $2, $3) returning id",
      [userId, business, modules],
    );
    await client.query("commit");
    return { userId, businessId: rows[0].id };
  } catch (failure) {
    await client.query("rollback").catch(() => {});
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw failure;
  } finally {
    await client.end();
  }
}

/** Borra el negocio del dueño con sus filas, los intentos de su número y la cuenta (su PIN se borra con ella). */
export async function deleteOwner(userId) {
  const { admin } = settings();
  const client = await connect();
  try {
    await client.query("begin");
    const businesses = (await client.query("select id from public.businesses where owner_id = $1", [userId])).rows.map(
      (row) => row.id,
    );
    for (const table of ["private.audit_log", "private.business_counters", "public.business_settings"]) {
      await client.query(`delete from ${table} where business_id = any($1)`, [businesses]);
    }
    await client.query("delete from public.businesses where id = any($1)", [businesses]);
    await client.query(
      "delete from private.sign_in_attempts where phone in (select phone from private.pin_credentials where user_id = $1)",
      [userId],
    );
    await client.query("commit");
  } catch (failure) {
    await client.query("rollback").catch(() => {});
    throw failure;
  } finally {
    await client.end();
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`No se pudo borrar la cuenta: ${error.message}`);
}
