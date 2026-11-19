// Prueba de las reglas de lint: cada archivo de tools/lint-fixtures debe fallar con su regla, y los correctos pasar limpios
import { ESLint } from "eslint";

const ROOT = process.argv[2] ?? "tools/lint-fixtures";
const D = "boundaries/dependencies";
const EXPECTED = {
  "app/talks-to-supabase.tsx": [D],
  "app/enters-feature.tsx": [D],
  "components/ui/knows-business.tsx": [D],
  "components/ui/uses-test-helpers.tsx": [D],
  "components/ui/no-a11y.tsx": ["react-native-a11y/has-valid-accessibility-descriptors"],
  "features/orders/api/uses-components.ts": [D],
  "features/orders/components/uses-api.tsx": [D],
  "features/orders/components/enters-other-feature.tsx": [D],
  "features/orders/components/uses-supabase-js.tsx": [D],
  "features/orders/components/raw-color.tsx": ["no-restricted-syntax"],
  "features/orders/components/two-components.tsx": ["react/no-multi-comp"],
  "features/orders/components/OrderCard.tsx": ["check-file/filename-naming-convention"],
  "features/orders/hooks/use-api.ts": [D],
  "features/orders/queries/uses-hooks.ts": [D],
  "features/orders/rules/uses-api.ts": [D],
  "features/orders/rules/uses-lib-supabase.ts": [D],
  "features/orders/rules/uses-react.ts": [D],
  "features/orders/rules/uses-asset.ts": [D],
  "features/orders/rules/shortcuts.ts": [
    "@typescript-eslint/ban-ts-comment",
    "@typescript-eslint/no-explicit-any",
    "no-console",
  ],
  "features/orders/rules/too-long.ts": ["max-lines"],
  "features/leaky/index.ts": ["no-restricted-syntax"],
  "lib/knows-business.ts": [D],
  "lib/cycle-a.ts": ["import-x/no-cycle"],
  "lib/cycle-b.ts": ["import-x/no-cycle"],
  "lib/disables-lint.ts": ["comentario-sin-efecto", "no-console"],
  "outside-structure.ts": ["boundaries/no-unknown-files"],
};
const IGNORED = new Set(["import/no-unresolved"]); // los archivos de prueba importan paquetes que pueden no estar instalados

const eslint = new ESLint({ ignore: false });
const results = await eslint.lintFiles([`${ROOT}/src`]);
const failures = [];
for (const r of results) {
  const file = r.filePath.split(`${ROOT}/src/`)[1];
  const idOf = (m) =>
    m.ruleId ?? (m.message.includes("noInlineConfig") ? "comentario-sin-efecto" : `fatal: ${m.message}`);
  const got = [...new Set(r.messages.map(idOf))].filter((id) => !IGNORED.has(id)).sort();
  const want = [...(EXPECTED[file] ?? [])].sort();
  if (got.join() !== want.join())
    failures.push(
      `${file}\n    esperado: ${want.join(", ") || "(limpio)"}\n    obtenido: ${got.join(", ") || "(limpio)"}`,
    );
}
const missing = Object.keys(EXPECTED).filter((f) => !results.some((r) => r.filePath.endsWith(`${ROOT}/src/${f}`)));
if (missing.length) failures.push(`faltan archivos de prueba: ${missing.join(", ")}`);
if (failures.length) {
  console.error(`Reglas de lint: ${failures.length} diferencia(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Reglas de lint: ${results.length} archivos, todo como se esperaba`);
