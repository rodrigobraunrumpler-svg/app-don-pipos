import assert from "node:assert/strict";
import { test } from "node:test";

import { ownerPassword } from "./owner-password.ts";

const USER = "00000000-0000-4000-8000-00000000000a";

test("el mismo id con el mismo secreto da siempre la misma contraseña", async () => {
  assert.equal(await ownerPassword(USER, "secreto-1"), await ownerPassword(USER, "secreto-1"));
});

test("otro id u otro secreto dan otra contraseña", async () => {
  const base = await ownerPassword(USER, "secreto-1");
  assert.notEqual(await ownerPassword("00000000-0000-4000-8000-00000000000b", "secreto-1"), base);
  assert.notEqual(await ownerPassword(USER, "secreto-2"), base);
});

test("tiene 43 caracteres de base64url", async () => {
  assert.match(await ownerPassword(USER, "secreto-1"), /^[A-Za-z0-9_-]{43}$/);
});
