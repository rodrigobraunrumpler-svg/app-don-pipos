// Prueba de las reglas de lint (pnpm lint:rules): falla si una regla deja de atrapar lo que debe.
// Cada archivo de tools/lint-fixtures/src debe dar exactamente las reglas de scripts/lint-fixtures.mjs,
// las mismas y las mismas veces; los que no están en esa lista deben pasar limpios.
import { relative } from "node:path";

import { ESLint } from "eslint";

import { EXPECTED, IGNORED } from "./lint-fixtures.mjs";

const ROOT = process.argv[2] ?? "tools/lint-fixtures";
const eslint = new ESLint({ ignore: false });
const failures = [];

const ruleOf = (message) =>
  message.ruleId ??
  (message.message.includes("noInlineConfig") ? "comentario-sin-efecto" : `fatal: ${message.message}`);
const rulesOf = (result) =>
  result.messages
    .map(ruleOf)
    .filter((rule) => !IGNORED.has(rule))
    .sort();
// «max-lines, no-console ×2»: cada regla con las veces que saltó
function tally(rules) {
  const times = (rule) => rules.filter((other) => other === rule).length;
  const names = [...new Set(rules)].map((rule) => (times(rule) > 1 ? `${rule} ×${times(rule)}` : rule));
  return names.join(", ") || "(limpio)";
}

const results = await eslint.lintFiles([`${ROOT}/src`]);
const seen = new Set();
for (const result of results) {
  const file = relative(`${ROOT}/src`, result.filePath);
  seen.add(file);
  const got = rulesOf(result);
  const want = [...(EXPECTED[file] ?? [])].sort();
  if (got.join() !== want.join()) failures.push(`${file}\n    esperado: ${tally(want)}\n    obtenido: ${tally(got)}`);
}
const missing = Object.keys(EXPECTED).filter((file) => !seen.has(file));
if (missing.length) failures.push(`faltan archivos de prueba: ${missing.join(", ")}`);

if (failures.length) {
  console.error(`Reglas de lint: ${failures.length} diferencia(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Reglas de lint: ${results.length} archivos de prueba, todo como se esperaba`);
