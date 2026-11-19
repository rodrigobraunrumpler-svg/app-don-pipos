import assert from "node:assert/strict";
import { test } from "node:test";

import { ACCEPTED_ADVICE, pendingAdvice } from "./advisors.mjs";

const advice = (name, level) => ({ name, level, title: name, detail: "…" });

test("un aviso o un error que no está aceptado queda pendiente", () => {
  assert.deepEqual(
    pendingAdvice([advice("rls_disabled_in_public", "ERROR"), advice("unindexed_foreign_keys", "WARN")]).map(
      (a) => a.name,
    ),
    ["rls_disabled_in_public", "unindexed_foreign_keys"],
  );
});

test("lo aceptado y lo solo informativo no quedan pendientes", () => {
  assert.deepEqual(
    pendingAdvice([advice("auth_leaked_password_protection", "WARN"), advice("unused_index", "INFO")]),
    [],
  );
});

test("cada aviso aceptado dice por qué", () => {
  for (const [name, reason] of Object.entries(ACCEPTED_ADVICE)) assert.ok(reason.length > 20, name);
});
