import assert from "node:assert/strict";
import { test } from "node:test";

import { assertDevProject, yesTarget } from "./guard.mjs";

test("deja pasar al proyecto de desarrollo", () => {
  assert.doesNotThrow(() => assertDevProject("abcdefghijklmnopqrst", "abcdefghijklmnopqrst", "db push --yes"));
});

test("se niega con otro proyecto, sin enlace o sin la variable", () => {
  const cases = [
    ["zzzzzzzzzzzzzzzzzzzz", "abcdefghijklmnopqrst"],
    [null, "abcdefghijklmnopqrst"],
    ["abcdefghijklmnopqrst", undefined],
    ["", ""],
  ];
  for (const [ref, dev] of cases) {
    assert.throws(
      () => assertDevProject(ref, dev, "db push --yes"),
      /db push --yes solo corre en el proyecto de desarrollo/,
    );
  }
});

test("sin --yes no hay nada que vigilar", () => {
  assert.equal(yesTarget(["db", "lint", "--remote"], {}, "abcdefghijklmnopqrst"), undefined);
  assert.equal(yesTarget(["db", "push", "--remote", "--yes=false"], {}, "abcdefghijklmnopqrst"), undefined);
});

test("con --yes el destino es el proyecto enlazado, o el que diga --remote=", () => {
  assert.equal(yesTarget(["db", "push", "--remote", "--yes"], {}, "abcdefghijklmnopqrst"), "abcdefghijklmnopqrst");
  assert.equal(
    yesTarget(["db", "push", "--yes", "--remote=zzzzzzzzzzzzzzzzzzzz"], {}, "abcdefghijklmnopqrst"),
    "zzzzzzzzzzzzzzzzzzzz",
  );
  assert.equal(
    yesTarget(["db", "push", "--yes", "--remote=postgres://u:p@host/db"], {}, "abcdefghijklmnopqrst"),
    "postgres://u:p@host/db",
  );
  assert.equal(yesTarget(["db", "push", "--remote", "--yes"], {}, null), null);
});

test("SUPABASE_YES en el entorno cuenta igual que --yes", () => {
  assert.equal(
    yesTarget(["db", "reset", "--remote"], { SUPABASE_YES: "1" }, "abcdefghijklmnopqrst"),
    "abcdefghijklmnopqrst",
  );
});
