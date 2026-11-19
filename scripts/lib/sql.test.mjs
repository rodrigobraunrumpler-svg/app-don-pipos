import assert from "node:assert/strict";
import { test } from "node:test";

import { assertIsolated, parseTap } from "./sql.mjs";

test("una prueba con commit, begin o rollback se rechaza", () => {
  for (const sql of [
    "select 1; commit;",
    "BEGIN;\nselect 1;",
    "select 1;\n  rollback ;",
    "start transaction; select 1;",
    "select 1; end;",
  ]) {
    assert.throws(() => assertIsolated(sql, "x.test.sql"), /x\.test\.sql: una prueba no abre ni cierra transacciones/);
  }
});

test("las mismas palabras dentro de un bloque, un texto o un comentario no cuentan", () => {
  const sql =
    "do $$ begin perform 1; end $$;\nselect 'commit; begin';\n-- rollback\n/* commit; */ select 1;\ncreate function f() returns int language plpgsql as $body$ begin return 1; end; $body$;";
  assert.doesNotThrow(() => assertIsolated(sql, "x.test.sql"));
});

test("lee el plan y cuenta lo que pasa y lo que falla", () => {
  const result = parseTap([
    "1..3",
    "ok 1 - uno",
    "not ok 2 - dos",
    '# Failed test 2: "dos"',
    "ok 3 - tres",
    "otra fila cualquiera",
  ]);
  assert.deepEqual(result, { planned: 3, passed: 2, failed: ["2 - dos"] });
});

test("sin plan, planned es null", () => {
  assert.equal(parseTap(["ok 1 - uno"]).planned, null);
});
