// Cambiar el PIN (docs/spec/auth.md §3). Pide la sesión del dueño; el PIN actual cuenta como intento.
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";

import { firstKey, json } from "../_shared/respond.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const publishableKey = firstKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));

const SIX_DIGITS = /^\d{6}$/;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { status: "method_not_allowed" });
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const client = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = token ? await client.auth.getUser(token) : { data: { user: null }, error: null };
    if (error || !data.user) return json(401, { status: "unauthorized" });

    const body = await req.json().catch(() => null);
    const current = typeof body?.current === "string" && SIX_DIGITS.test(body.current) ? body.current : null;
    const next = typeof body?.next === "string" && SIX_DIGITS.test(body.next) ? body.next : null;
    if (!current || !next) return json(400, { status: "invalid" });

    const [row] = await sql`select private.change_pin(${data.user.id}::uuid, ${current}, ${next}) as result`;
    return json(200, row!.result);
  } catch (error) {
    console.error("change-pin", error instanceof Error ? error.message : "error");
    return json(500, { status: "error" });
  }
});
