import assert from "node:assert/strict";
import { test } from "node:test";

import { assertDevProject, childEnv, confirmedCommandProblem } from "./guard.mjs";

const DEV = "abcdefghijklmnopqrst";
const OTHER = "zzzzzzzzzzzzzzzzzzzz";

test("deja pasar al proyecto de desarrollo", () => {
  assert.doesNotThrow(() => assertDevProject(DEV, DEV, "db push --yes"));
});

test("se niega con otro proyecto, sin enlace o sin la variable", () => {
  const cases = [
    [OTHER, DEV],
    [null, DEV],
    [DEV, undefined],
    ["", ""],
  ];
  for (const [ref, dev] of cases) {
    assert.throws(
      () => assertDevProject(ref, dev, "db push --yes"),
      /db push --yes solo corre en el proyecto de desarrollo/,
    );
  }
});

const problem = (args, env = {}, linked = DEV) => confirmedCommandProblem(args, env, linked, DEV);

test("un comando que no confirma nada no tiene problema, apunte adonde apunte", () => {
  assert.equal(problem(["db", "lint", "--remote"]), null);
  assert.equal(problem(["migration", "list", `--remote=${OTHER}`]), null);
});

test("confirmar en el proyecto de desarrollo enlazado está bien", () => {
  assert.equal(problem(["db", "push", "--remote", "--yes"]), null);
  assert.equal(problem(["functions", "deploy", "sign-in-with-pin", "--use-api", "--yes"]), null);
  assert.equal(problem(["db", "push", `--remote=${DEV}`, "--yes"]), null);
});

test("confirmar en otro proyecto se niega, se escriba como se escriba", () => {
  const forms = [
    ["db", "reset", `--remote=${OTHER}`, "--yes"],
    ["db", "reset", "--remote", OTHER, "--yes"],
    ["projects", "delete", OTHER, "--yes"],
    ["db", "push", "--yes", "--project-ref", DEV],
    ["db", "push", "--yes", `--db-url=postgres://u:p@host/db`],
    ["db", "push", "--yes", "--workdir", "/otra/copia"],
    ["db", "push", "--yes", "--workdir=/otra/copia"],
  ];
  for (const args of forms)
    assert.match(problem(args) ?? "", /solo corre en el proyecto de desarrollo/, args.join(" "));
});

test("cualquier forma de --yes, o SUPABASE_YES, cuenta como confirmar", () => {
  assert.notEqual(problem(["db", "reset", `--remote=${OTHER}`, "--yes=false"]), null);
  assert.notEqual(problem(["db", "reset", `--remote=${OTHER}`], { SUPABASE_YES: "1" }), null);
});

test("sin proyecto enlazado, confirmar se niega", () => {
  assert.notEqual(problem(["db", "push", "--remote", "--yes"], {}, null), null);
});

test("el aviso nunca repite una URL con su contraseña", () => {
  const text = problem(["db", "push", "--yes", "--remote=postgres://usuario:clave-secreta@host:5432/postgres"]) ?? "";
  assert.match(text, /solo corre en el proyecto de desarrollo/);
  assert.doesNotMatch(text, /clave-secreta/);
});

test("la CLI corre sin las variables que cambian de proyecto o de carpeta, y con su propia sesión", () => {
  const env = childEnv({ SUPABASE_PROJECT_ID: OTHER, SUPABASE_WORKDIR: "/otra", PATH: "/bin" }, "/home/x");
  assert.equal(env.SUPABASE_PROJECT_ID, undefined);
  assert.equal(env.SUPABASE_WORKDIR, undefined);
  assert.equal(env.PATH, "/bin");
  assert.equal(env.SUPABASE_HOME, "/home/x/.supabase-varmar-app");
  assert.equal(childEnv({ SUPABASE_HOME: "/ya/puesta" }, "/home/x").SUPABASE_HOME, "/ya/puesta");
});
