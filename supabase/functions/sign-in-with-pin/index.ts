// Ingresar con el número y el PIN (docs/spec/auth.md §3). Se llama sin sesión: la abre si el PIN es correcto.
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";

import { ownerPassword } from "../_shared/owner-password.ts";
import { normalizePhone } from "../_shared/phone.ts";
import { firstKey, json } from "../_shared/respond.ts";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const publishableKey = firstKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
const passwordSecret = Deno.env.get("AUTH_PASSWORD_SECRET")!;

type CheckResult =
  | { status: "ok"; userId: string; email: string }
  | { status: "wrong_pin"; attemptsLeft: number }
  | { status: "locked"; retryAt: string }
  | { status: "hard_locked" };

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { status: "method_not_allowed" });
  try {
    const body = await req.json().catch(() => null);
    const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
    const pin = typeof body?.pin === "string" && /^\d{6}$/.test(body.pin) ? body.pin : null;
    if (!phone || !pin) return json(400, { status: "invalid" });

    const [row] = await sql`select private.check_pin(${phone}, ${pin}) as result`;
    const result = row!.result as CheckResult;
    if (result.status !== "ok") return json(200, result);

    const client = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email: result.email,
      password: await ownerPassword(result.userId, passwordSecret),
    });
    if (error || !data.session) {
      console.error("sign-in-with-pin: no se pudo abrir la sesión", error?.message);
      return json(500, { status: "error" });
    }
    const { access_token, refresh_token, expires_at } = data.session;
    return json(200, {
      status: "ok",
      session: { accessToken: access_token, refreshToken: refresh_token, expiresAt: expires_at },
    });
  } catch (error) {
    console.error("sign-in-with-pin", error instanceof Error ? error.message : "error");
    return json(500, { status: "error" });
  }
});
