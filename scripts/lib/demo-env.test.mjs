import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { saveDemo } from "./demo-env.mjs";

const COMMENT = "# Dueño DEMO del proyecto de desarrollo, para probar el ingreso en Expo Go";
const envFile = () => join(mkdtempSync(join(tmpdir(), "demo-env-")), ".env.local");

test("guarda el dueño DEMO, deja las demás líneas como estaban y solo el dueño del archivo lo lee", () => {
  const file = envFile();
  writeFileSync(file, `A=1\n# nota\n${COMMENT}\nDEMO_OWNER_PHONE=+51900000100\nDEMO_OWNER_PIN=111111\nB=2\n`);
  saveDemo(file, "+51900000101", "222222");
  const text = readFileSync(file, "utf8");
  assert.match(text, /^A=1\n# nota\nB=2\n/);
  assert.match(text, /\nDEMO_OWNER_PHONE=\+51900000101\nDEMO_OWNER_PIN=222222\n$/);
  assert.equal(text.match(/DEMO_OWNER_/g).length, 2);
  assert.equal(text.split(COMMENT).length, 2);
  assert.equal(statSync(file).mode & 0o777, 0o600);
});

test("si la escritura falla, .env.local queda como estaba: los secretos no se pierden", () => {
  const file = envFile();
  writeFileSync(file, "SECRETO=1\n");
  mkdirSync(`${file}.tmp`);
  assert.throws(() => saveDemo(file, "+51900000101", "222222"));
  assert.equal(readFileSync(file, "utf8"), "SECRETO=1\n");
});
