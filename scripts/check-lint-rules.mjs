// Prueba de las reglas de lint (pnpm lint:rules): falla si una regla deja de atrapar lo que debe. Dos partes:
// 1. Los archivos de prueba. Cada archivo de tools/lint-fixtures/src debe dar exactamente las reglas de
//    scripts/lint-fixtures.mjs, las mismas y las mismas veces; los que no están en esa lista deben pasar limpios.
// 2. La tabla «quién puede usar a quién» (scripts/lint-matrix.mjs). Por cada fila se le da al lint un archivo que
//    importa todas las columnas: debe prohibir exactamente las que la fila no puede usar.
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { ESLint } from "eslint";

import { EXPECTED, IGNORED } from "./lint-fixtures.mjs";
import { ROWS, TARGETS } from "./lint-matrix.mjs";

const ROOT = process.argv[2] ?? "tools/lint-fixtures";
const DEPENDENCIES = "boundaries/dependencies";
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

// 1. Los archivos de prueba
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

// 2. La tabla, celda por celda
const isFile = (target) => target.startsWith("src/") || target.startsWith("assets/");
// Cómo se escribe la importación: un paquete tal cual; un archivo, con su ruta desde quien lo importa
function specifier(from, target) {
  if (!isFile(target)) return target;
  const path = relative(dirname(from), target).replace(/\.tsx?$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}
// Una columna que apunta a un archivo que no existe daría «prohibido» por la razón equivocada
const lost = Object.entries(TARGETS).filter(([, target]) => isFile(target) && !existsSync(join(ROOT, target)));
if (lost.length) failures.push(`columnas sin su archivo de ejemplo: ${lost.map(([column]) => column).join(", ")}`);
let cells = 0;
for (const [row, { file, canUse }] of Object.entries(ROWS)) {
  const unknown = canUse.filter((name) => !(name in TARGETS));
  if (unknown.length) failures.push(`${row}: la fila nombra columnas que no existen: ${unknown.join(", ")}`);
  // Un archivo no se importa a sí mismo: esa celda no existe
  const columns = Object.entries(TARGETS).filter(([, target]) => target !== file);
  const code = columns.map(([, target]) => `import ${JSON.stringify(specifier(file, target))};\n`).join("");
  const [result] = await eslint.lintText(code, { filePath: join(ROOT, file) });
  const fatal = result.messages.filter((message) => message.fatal || message.ruleId === null);
  if (fatal.length)
    failures.push(`${row}: el lint no pudo leer la fila: ${fatal.map((message) => message.message).join("; ")}`);
  const forbiddenLines = new Set(result.messages.filter((m) => m.ruleId === DEPENDENCIES).map((m) => m.line));
  columns.forEach(([column], index) => {
    cells += 1;
    const allowed = canUse.includes(column);
    const passes = !forbiddenLines.has(index + 1);
    if (allowed !== passes)
      failures.push(
        `${row} → ${column}: la tabla dice «${allowed ? "se puede" : "prohibido"}» y el lint ${passes ? "lo deja pasar" : "lo prohíbe"}`,
      );
  });
}

if (failures.length) {
  console.error(`Reglas de lint: ${failures.length} diferencia(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `Reglas de lint: ${results.length} archivos de prueba y ${cells} celdas de la tabla (${Object.keys(ROWS).length} filas), todo como se esperaba`,
);
