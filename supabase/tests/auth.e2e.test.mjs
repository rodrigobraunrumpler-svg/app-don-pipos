// Las funciones del acceso, subidas al proyecto de desarrollo: pnpm test:auth (después de pnpm functions:deploy).
// Crea un dueño temporal y lo borra al terminar, pase lo que pase.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { connect } from "../../scripts/lib/db.mjs";
import { loadEnv } from "../../scripts/lib/guard.mjs";
import { createOwner, deleteOwner } from "../../scripts/lib/owners.mjs";

loadEnv();
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const PHONE = "+51900000150";
const UNKNOWN = "+51900000151";
const PIN = "197346";
const NEW_PIN = "582039";
const responses = [];

async function call(name, { method = "POST", body, token } = {}) {
  const headers = { apikey: KEY, "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${URL}/functions/v1/${name}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  responses.push(text);
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

let owner;
let session;

before(async () => {
  owner = await createOwner({ phone: PHONE, business: "Negocio de prueba (DEMO)", modules: [], pin: PIN });
});

after(async () => {
  if (owner) await deleteOwner(owner.userId);
  const client = await connect();
  try {
    await client.query("delete from private.sign_in_attempts where phone = any($1)", [[PHONE, UNKNOWN]]);
  } finally {
    await client.end();
  }
});

test("con el PIN correcto abre la sesión, y con ella se lee el negocio", async () => {
  const { status, json } = await call("sign-in-with-pin", { body: { phone: "900 000 150", pin: PIN } });
  assert.equal(status, 200);
  assert.equal(json.status, "ok");
  assert.ok(json.session.accessToken && json.session.refreshToken && json.session.expiresAt);
  session = json.session;

  const res = await fetch(`${URL}/rest/v1/rpc/get_business`, {
    method: "POST",
    headers: { apikey: KEY, authorization: `Bearer ${session.accessToken}`, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).name, "Negocio de prueba (DEMO)");
});

test("un PIN equivocado y un número sin cuenta responden lo mismo", async () => {
  const wrong = await call("sign-in-with-pin", { body: { phone: PHONE, pin: "000001" } });
  const unknown = await call("sign-in-with-pin", { body: { phone: UNKNOWN, pin: "000001" } });
  assert.deepEqual(wrong.json, { status: "wrong_pin", attemptsLeft: 4 });
  assert.deepEqual(unknown.json, wrong.json);
});

test("lo mal formado responde 400, y otro método 405", async () => {
  assert.deepEqual(await call("sign-in-with-pin", { body: { phone: "123", pin: PIN } }), {
    status: 400,
    json: { status: "invalid" },
  });
  assert.equal((await call("sign-in-with-pin", { method: "GET" })).status, 405);
});

test("cambiar el PIN pide sesión, cuenta el PIN actual y rechaza uno fácil", async () => {
  assert.equal((await call("change-pin", { body: { current: PIN, next: NEW_PIN } })).status, 401);
  const wrong = await call("change-pin", { token: session.accessToken, body: { current: "000001", next: NEW_PIN } });
  assert.equal(wrong.json.status, "wrong_pin");
  const obvious = await call("change-pin", { token: session.accessToken, body: { current: PIN, next: "123456" } });
  assert.deepEqual(obvious.json, { status: "obvious_pin" });
  const ok = await call("change-pin", { token: session.accessToken, body: { current: PIN, next: NEW_PIN } });
  assert.deepEqual(ok.json, { status: "ok" });
  const again = await call("sign-in-with-pin", { body: { phone: PHONE, pin: NEW_PIN } });
  assert.equal(again.json.status, "ok");
});

test("ninguna respuesta lleva el id, el correo ni el hash", () => {
  for (const text of responses) assert.doesNotMatch(text, /userId|email|\$2/, text);
});
