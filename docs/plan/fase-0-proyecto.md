# Fase 0: el proyecto con su estructura y sus reglas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** dejar el proyecto Expo SDK 58 vacío pero completo. Tiene la estructura de carpetas acordada, las reglas que la hacen cumplir (probadas), el tema claro y oscuro, lo común de `lib`, el generador de módulos, los commits vigilados y el CI.

**Arquitectura:** una app Expo Router en `src/app`, con módulos de forma fija en `src/features/<módulo>` y lo común en `src/components/ui`, `src/lib` y `src/theme`. El orden no depende de la disciplina: ESLint falla si algo se sale, y un script comprueba las propias reglas contra archivos hechos para romperlas.

**Stack:** Expo SDK 58 (React Native 0.88, React 19.3), Expo Router, TypeScript 6 estricto, pnpm 10, Node 24, NativeWind 4 con Tailwind 3 (o `StyleSheet`, según la tarea 3), TanStack Query 5, date-fns 4 con @date-fns/tz, Jest (jest-expo) con Testing Library 14, ESLint 9, Prettier, lefthook, commitlint y gitleaks.

**Especificación:** `docs/PROJECT_CONTEXT.md` (§9, §9.1, §10, §14, §14.2 y §14.4), `docs/spec/README.md` y `docs/glossary.md`. Los colores salen de `docs/design/pantallas/assets/donpipos.css`.

## Restricciones globales

- **Versiones:**
  - Node 24 (`.nvmrc`) y pnpm 10, con `node-linker=hoisted`.
  - `expo ~58.0.26`, `react-native 0.88.1`, `react 19.3.1`, `expo-router ~58.0.32`.
  - Todo paquete de Expo se instala con `npx expo install`, nunca con `pnpm add`, para que su versión coincida con el SDK.
  - TypeScript `~6.0.3`, el de la plantilla. No se sube a 7.
  - ESLint 9, el que instala `npx expo lint`. No se sube a 10: la configuración de Expo 58 todavía no lo admite.
  - NativeWind `^4.2.7` con `tailwindcss ^3.4`. Nunca Tailwind 4.
  - Testing Library 14: `render` es asíncrono (`await render(...)`) y pide el paquete `test-renderer`.
- **Identidad:** paquete de Android `pe.varmar.app`, nombre «Don Pipos», slug `varmar-app`.
- **Idioma:** el código en inglés; los textos que ve el dueño, en español (es-PE).
- **Nombres:** carpetas y archivos en kebab-case, salvo los nombres propios de Expo Router dentro de `src/app`.
- **Tamaño:** un componente por archivo y 250 líneas como máximo, sin contar líneas en blanco ni comentarios.
- **Colores:** solo en `src/theme`. Fuera de ahí están prohibidos los hexadecimales, `rgb()`, `hsl()` y los valores sueltos de Tailwind (`[#…]`).
- **Prohibido:** `any`, `@ts-ignore`, `console.*`, los comentarios `eslint-disable` y `export *` en el `index.ts` de un módulo.
- **Montos:** céntimos enteros. Formato `S/ 12.00`, con un espacio que no se corta, coma en los miles y punto en los decimales.
- **Fechas:** `America/Lima`. El día cambia a las 05:00 UTC.
- **Pruebas:** primero la prueba. Cobertura del 100 % en `src/lib/{money,dates,errors}.ts`, en `src/theme/tokens.ts` y en todo `src/features/*/rules/**`.
- **Commits:** Conventional Commits en inglés, tipos `feat`, `fix`, `docs`, `chore`, `refactor` o `test`, asunto de hasta 100 caracteres, sin cuerpo ni pie. Un commit por tarea.
- **Secretos:** `.env.local` nunca entra al repositorio.

## Fuera de esta fase

Se crean en la fase que los usa por primera vez, no antes:
- `src/lib/env.ts` y `src/lib/supabase.ts`, con la sesión cifrada: fase 2.
- Sentry, sin datos personales: fase 2, junto con la primera APK.
- `src/types/database.ts`, las pruebas de la base y el medidor de rendimiento: fase 1.
- `src/lib/haptics.ts`, `whatsapp.ts` e `images.ts`, FlashList y expo-image: con la primera pantalla que los necesite.
- La cobertura del 100 % en `src/features/*/rules/**` ya está configurada; empieza a contar cuando exista el primer módulo.

## Foco de revisión

1. **Un monto escrito a medias o raro** («12,5», « 7 », «12.», «12.345», «-3», «abc», vacío): la app lo entiende o lo rechaza, pero nunca guarda otro número. → Tarea 4, `parseSoles`.
2. **La medianoche de Lima:** a las 23:59 del 18 (04:59 UTC del 19) sigue siendo el 18. → Tarea 4, `businessDate`.
3. **Modo oscuro:** un color que falta o sin contraste deja un texto invisible. → Tarea 3, mismas claves y contraste de 4.5 o más.
4. **Un error raro** (un texto suelto, `null`, un objeto sin forma): el dueño ve un mensaje en español, nunca el error técnico. → Tarea 4, `toAppError` y `errorMessage`.
5. **Saltarse una regla con `// eslint-disable`:** el comentario no tiene efecto y el lint falla igual. → Tarea 2, archivo de prueba `disables-lint.ts`.

---

### Task 1: El proyecto Expo con sus pruebas

**Archivos:**
- Crear: `package.json`, `pnpm-lock.yaml`, `.npmrc`, `.nvmrc`, `.gitignore`, `tsconfig.json`, `app.config.ts`, `jest.config.js`, `assets/icon.png`, `src/app/_layout.tsx`, `src/app/index.tsx`
- Prueba: `src/test/routes/home.test.tsx`

**Interfaces:**
- Produce: los comandos `pnpm typecheck`, `pnpm test` y `pnpm test:coverage`; el alias `@/*` → `src/*`; la ruta `/` (`src/app/index.tsx`, exporta `Home` por defecto).
- Las pruebas de las pantallas viven en `src/test/routes/`, nunca dentro de `src/app`: Expo Router trata todo archivo de `src/app` como una ruta.

- [ ] **Paso 1: Crear el proyecto en una carpeta temporal y traerlo al repositorio**

```bash
cd /home/javier/var-mar
pnpm dlx create-expo-app@latest app-scaffold --template default@sdk-58 --no-install
rsync -a --exclude .git --exclude README.md app-scaffold/ app/ && rm -rf app-scaffold
cd app && printf 'node-linker=hoisted\n' > .npmrc && printf '24\n' > .nvmrc && pnpm install
```

- [ ] **Paso 2: Quitar el ejemplo de la plantilla**

Borra todo lo que la plantilla trae como ejemplo: sus pantallas (`app/` o `src/app/`) y las carpetas `components/`, `constants/`, `hooks/`, `scripts/` y `assets/images/`, o sus equivalentes dentro de `src/`. Deben quedar solo los archivos de configuración. Después copia el logo:

```bash
mkdir -p assets src/app src/test/routes
cp /home/javier/var-mar/product/references/branding/logos/don-pipos-logo.png assets/icon.png
```

- [ ] **Paso 3: Configurar `package.json`, `tsconfig.json` y `app.config.ts`**

En `package.json`: `"name": "varmar-app"`, `"private": true`, `"main": "expo-router/entry"`, `"packageManager": "pnpm@10.33.0"`, `"engines": { "node": ">=24 <25" }` y estos scripts:

```json
{
  "start": "expo start",
  "android": "expo start --android",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:coverage": "jest --coverage"
}
```

`tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "tools/lint-fixtures", "templates"]
}
```

`app.config.ts` reemplaza al `app.json` de la plantilla:

```ts
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Don Pipos",
  slug: "varmar-app",
  scheme: "donpipos",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  android: {
    package: "pe.varmar.app",
    adaptiveIcon: { foregroundImage: "./assets/icon.png", backgroundColor: "#354b2e" },
  },
  plugins: [
    "expo-router",
    "expo-font",
    ["expo-splash-screen", { image: "./assets/icon.png", imageWidth: 180, backgroundColor: "#354b2e" }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
```

`userInterfaceStyle: "automatic"` es lo que deja que la app siga el modo oscuro del celular. Si la plantilla no trae `babel-plugin-react-compiler`, instálalo con `npx expo install babel-plugin-react-compiler`.

Agrega a `.gitignore`: `.env*.local` y `coverage/`.

- [ ] **Paso 4: Instalar las pruebas y configurar Jest**

```bash
npx expo install jest-expo jest @types/jest -- --save-dev
pnpm add -D @testing-library/react-native@^14 test-renderer
```

`jest.config.js`:

```js
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/tools/lint-fixtures/", "/templates/"],
  collectCoverageFrom: [
    "src/lib/{money,dates,errors}.ts",
    "src/theme/tokens.ts",
    "src/features/*/rules/**/*.ts",
    "!**/*.test.ts",
  ],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
```

- [ ] **Paso 5: Escribir la prueba que falla**

`src/test/routes/home.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";

import Home from "@/app/index";

test("la portada muestra el nombre de la app y la fase", async () => {
  await render(<Home />);
  expect(screen.getByText("Don Pipos")).toBeOnTheScreen();
  expect(screen.getByText("Fase 0 lista")).toBeOnTheScreen();
});
```

- [ ] **Paso 6: Correrla y ver que falla**

Corre: `pnpm test`
Esperado: FALLA con «Cannot find module '@/app/index'».

- [ ] **Paso 7: Crear `src/app/_layout.tsx` y `src/app/index.tsx`**

- `_layout.tsx`: exporta por defecto `RootLayout(): JSX.Element`, un `Stack` de `expo-router` con `screenOptions={{ headerShown: false }}`.
- `index.tsx`: exporta por defecto `Home(): JSX.Element`, con los textos «Don Pipos» y «Fase 0 lista». Todavía sin estilos; los pone la tarea 3.

- [ ] **Paso 8: Correr todo y ver que pasa**

Corre: `pnpm test && pnpm typecheck && npx expo-doctor`
Esperado: 1 prueba pasa, `tsc` no reporta errores y `expo-doctor` termina sin problemas.

- [ ] **Paso 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold the Expo SDK 58 project with strict TypeScript and Jest"
```

---

### Task 2: Las reglas de estructura, con su propia prueba

Estas reglas se probaron el 2026-11-19 con ESLint 9.39.5, eslint-plugin-boundaries 7.4.4 y la configuración de Expo 58. Por eso los dos archivos de configuración van completos.

**Archivos:**
- Crear: `eslint.config.js`, `eslint/structure.js`, `scripts/check-lint-rules.mjs`, `.prettierrc.json`, `.prettierignore`, `tools/lint-fixtures/src/**` (44 archivos)
- Modificar: `package.json` (scripts y `pnpm.peerDependencyRules`)

**Interfaces:**
- Produce:
  - `pnpm lint`: el lint de todo el proyecto, sin advertencias;
  - `pnpm lint:rules`: comprueba las reglas contra `tools/lint-fixtures`;
  - `pnpm format`.
- Los tipos de carpeta que conoce el lint: `route`, `feature`, `feature-api`, `feature-queries`, `feature-schema`, `feature-rules`, `feature-hooks`, `feature-components`, `ui`, `lib`, `theme`, `test-utils` y `types`.

- [ ] **Paso 1: Instalar ESLint como lo pide Expo, y los plugins**

```bash
npx expo lint
pnpm add -D eslint-plugin-boundaries@^7 eslint-plugin-check-file@^3 eslint-plugin-import-x@^4 \
  eslint-import-resolver-typescript eslint-plugin-react-native-a11y@^3 @eslint/compat typescript-eslint \
  @tanstack/eslint-plugin-query prettier eslint-config-prettier globals
pnpm ls eslint
```

Esperado: `eslint 9.x`. Si `npx expo lint` instaló otra versión mayor, detente y anótalo: las reglas están probadas con la 9.

El plugin de accesibilidad declara ESLint hasta la 8, aunque funciona con la 9 a través de `@eslint/compat`. Para que pnpm no avise, agrega a `package.json`:

```json
{ "pnpm": { "peerDependencyRules": { "allowedVersions": { "eslint-plugin-react-native-a11y>eslint": "9" } } } }
```

- [ ] **Paso 2: Escribir los archivos de prueba del lint**

Van en `tools/lint-fixtures/src/`, con la misma forma que `src/` y con importaciones relativas, para que no dependan del proyecto real. Cada archivo exporta algo mínimo. Lo que importa es su línea clave.

Los correctos, que deben pasar limpios:

| Archivo | Contenido clave |
|---|---|
| `theme/tokens.ts` | `export const colors = { forest: "#354b2e" } as const;` |
| `lib/money.ts` | `export const formatCents = (cents: number): string => ...` |
| `lib/supabase.ts` | `export const supabase = { rpc: (name: string) => name };` |
| `components/ui/button.tsx` | Importa `../../theme/tokens`; un solo componente `Button` |
| `components/ui/button.test.tsx` | Importa `../../test/render` y `./button` |
| `test/render.tsx` | `export const renderWithProviders = (ui: unknown): unknown => ui;` |
| `test/routes/home.test.tsx` | Importa `../../app/index` y `../render` |
| `features/orders/constants.ts` | `export const ORDER_STATUSES = ["new", "preparing"] as const;` |
| `features/orders/schema/order.ts` | `export type Order = { id: string; totalCents: number };` |
| `features/orders/api/orders.ts` | Importa `../../../lib/supabase` y `../schema/order` |
| `features/orders/queries/orders.ts` | Importa `../api/orders` y `../schema/order` |
| `features/orders/rules/totals.ts` | Importa `../constants`, `../schema/order` y `../../../lib/money` |
| `features/orders/hooks/use-orders.ts` | Importa `../queries/orders` y `../rules/totals` |
| `features/orders/components/order-row.tsx` | Importa `../../../components/ui/button`, `../hooks/use-orders`, `../../products` (el índice de otro módulo) y `../../../lib/money` |
| `features/orders/index.ts` | Exporta por nombre `OrderRow`, `useOrders` y el tipo `Order` |
| `features/products/components/product-avatar.tsx` | Un componente `ProductAvatar` |
| `features/products/index.ts` | `export { ProductAvatar } from "./components/product-avatar";` |
| `features/leaky/components/thing.tsx` | Un componente `Thing` |
| `app/index.tsx` | Importa `../features/orders`; exporta `Home` por defecto |

Los que rompen una regla, con la regla que debe saltar:

| Archivo | Lo que hace mal | Regla esperada |
|---|---|---|
| `app/talks-to-supabase.tsx` | Importa `../lib/supabase` | `boundaries/dependencies` |
| `app/enters-feature.tsx` | Importa `../features/orders/api/orders` | `boundaries/dependencies` |
| `components/ui/knows-business.tsx` | Importa `../../features/orders` | `boundaries/dependencies` |
| `components/ui/uses-test-helpers.tsx` | Sin ser una prueba, importa `../../test/render` | `boundaries/dependencies` |
| `components/ui/no-a11y.tsx` | `<TouchableOpacity onPress={onPress} />` y `<Pressable onPress={onPress} />` sin rol ni etiqueta | `react-native-a11y/has-valid-accessibility-descriptors` |
| `features/orders/api/uses-components.ts` | Importa `../components/order-row` | `boundaries/dependencies` |
| `features/orders/components/uses-api.tsx` | Importa `../api/orders` | `boundaries/dependencies` |
| `features/orders/components/enters-other-feature.tsx` | Importa `../../products/components/product-avatar` | `boundaries/dependencies` |
| `features/orders/components/uses-supabase-js.tsx` | Importa `@supabase/supabase-js` | `boundaries/dependencies` |
| `features/orders/components/raw-color.tsx` | `style={{ color: "#354b2e" }}` y `className="bg-[#fff]"` | `no-restricted-syntax` |
| `features/orders/components/two-components.tsx` | Dos componentes en el archivo | `react/no-multi-comp` |
| `features/orders/components/OrderCard.tsx` | Nombre en PascalCase | `check-file/filename-naming-convention` |
| `features/orders/hooks/use-api.ts` | Importa `../api/orders` | `boundaries/dependencies` |
| `features/orders/queries/uses-hooks.ts` | Importa `../hooks/use-orders` | `boundaries/dependencies` |
| `features/orders/rules/uses-api.ts` | Importa `../api/orders` | `boundaries/dependencies` |
| `features/orders/rules/uses-lib-supabase.ts` | Importa `../../../lib/supabase` | `boundaries/dependencies` |
| `features/orders/rules/uses-react.ts` | Importa `react` | `boundaries/dependencies` |
| `features/orders/rules/shortcuts.ts` | `// @ts-ignore`, `: any` y `console.log` | `@typescript-eslint/ban-ts-comment`, `@typescript-eslint/no-explicit-any`, `no-console` |
| `features/orders/rules/too-long.ts` | 260 líneas `export const vN = N;` | `max-lines` |
| `features/leaky/index.ts` | `export * from "./components/thing";` | `no-restricted-syntax` |
| `lib/knows-business.ts` | Importa `../features/orders/constants` | `boundaries/dependencies` |
| `lib/cycle-a.ts` y `lib/cycle-b.ts` | Se importan entre sí | `import-x/no-cycle` en los dos |
| `lib/disables-lint.ts` | `// eslint-disable-next-line no-console` sobre un `console.log` | `comentario-sin-efecto` y `no-console` |
| `outside-structure.ts` | Un archivo suelto en `src/` | `boundaries/no-unknown-files` |

- [ ] **Paso 3: Escribir el comprobador**

`scripts/check-lint-rules.mjs`:

```js
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
  "features/orders/rules/shortcuts.ts": ["@typescript-eslint/ban-ts-comment", "@typescript-eslint/no-explicit-any", "no-console"],
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
  const idOf = (m) => m.ruleId ?? (m.message.includes("noInlineConfig") ? "comentario-sin-efecto" : `fatal: ${m.message}`);
  const got = [...new Set(r.messages.map(idOf))].filter((id) => !IGNORED.has(id)).sort();
  const want = [...(EXPECTED[file] ?? [])].sort();
  if (got.join() !== want.join()) failures.push(`${file}\n    esperado: ${want.join(", ") || "(limpio)"}\n    obtenido: ${got.join(", ") || "(limpio)"}`);
}
const missing = Object.keys(EXPECTED).filter((f) => !results.some((r) => r.filePath.endsWith(`${ROOT}/src/${f}`)));
if (missing.length) failures.push(`faltan archivos de prueba: ${missing.join(", ")}`);
if (failures.length) {
  console.error(`Reglas de lint: ${failures.length} diferencia(s)\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Reglas de lint: ${results.length} archivos, todo como se esperaba`);
```

Agrega a `package.json` los scripts `"lint": "eslint . --max-warnings 0"`, `"lint:rules": "node scripts/check-lint-rules.mjs"` y `"format": "prettier --write ."`.

- [ ] **Paso 4: Correrlo y ver que falla**

Corre: `pnpm lint:rules`
Esperado: FALLA con más de 20 diferencias. Los archivos malos todavía pasan limpios, porque las reglas no existen.

- [ ] **Paso 5: Escribir `eslint/structure.js`**

```js
// Quién puede usar a quién (PROJECT_CONTEXT.md §9.1). Gana la última política que coincide.
import boundaries from "eslint-plugin-boundaries";

const LAYERS = ["api", "queries", "schema", "rules", "hooks", "components"];
const same = { feature: "{{ from.element.captured.feature }}" };
const sameLayers = (...names) => names.map((n) => ({ element: { type: `feature-${n}`, captured: same } }));
const ownFile = (file) => ({ element: { type: "feature", captured: same, fileInternalPath: file } });
const otherFeatureIndex = {
  element: { type: "feature", captured: { feature: "!{{ from.element.captured.feature }}" }, fileInternalPath: "index.ts" },
};
const anyFeatureIndex = { element: { type: "feature", fileInternalPath: "index.ts" } };
const libButSupabase = { element: { type: "lib", fileInternalPath: "!supabase.ts" } };
const of = (...types) => ({ element: { type: types } });

export const structureSettings = {
  "boundaries/elements": [
    { type: "route", pattern: "src/app" },
    ...LAYERS.map((n) => ({ type: `feature-${n}`, pattern: `src/features/*/${n}`, capture: ["feature"] })),
    { type: "feature", pattern: "src/features/*", capture: ["feature"] },
    { type: "ui", pattern: "src/components/ui" },
    { type: "lib", pattern: "src/lib" },
    { type: "theme", pattern: "src/theme" },
    { type: "test-utils", pattern: "src/test" },
    { type: "types", pattern: "src/types" },
  ],
  "boundaries/files": [{ pattern: "**/*.test.{ts,tsx}", category: "test" }],
  "boundaries/legacy-templates": false,
};

export const structureRules = {
  "boundaries/no-unknown-files": 2,
  "boundaries/dependencies": [2, {
    default: "disallow",
    checkAllOrigins: true,
    checkUnknownLocals: true,
    policies: [
      { allow: { to: { module: { origin: ["external", "core"] } } } },
      { from: of("route"), allow: { to: [anyFeatureIndex, of("ui", "theme"), libButSupabase] } },
      { from: of("feature-components"), allow: { to: [...sameLayers("hooks", "queries", "rules", "schema"), ownFile("constants.ts"), otherFeatureIndex, of("ui", "theme"), libButSupabase] } },
      { from: of("feature-hooks"), allow: { to: [...sameLayers("queries", "rules", "schema"), ownFile("constants.ts"), otherFeatureIndex, libButSupabase] } },
      { from: of("feature-queries"), allow: { to: [...sameLayers("api", "schema"), libButSupabase] } },
      { from: of("feature-api"), allow: { to: [...sameLayers("schema"), of("lib", "types")] } },
      { from: of("feature-rules"), allow: { to: [...sameLayers("schema"), ownFile("constants.ts"), { element: { type: "lib", fileInternalPath: ["money.ts", "dates.ts"] } }] } },
      { from: of("feature"), allow: { to: sameLayers("components", "hooks", "queries", "rules", "schema") } },
      { from: of("ui"), allow: { to: [of("theme"), libButSupabase] } },
      { from: of("lib"), allow: { to: of("types") } },
      { from: of("test-utils"), allow: { to: [anyFeatureIndex, of("ui", "theme", "lib", "route")] } },
      { from: { file: { categories: "test" } }, allow: { to: of("test-utils") } },
      {
        from: of("feature-api", "feature-rules", "feature-schema"),
        disallow: { to: { module: { origin: "external", source: ["react", "react-native", "expo-*", "@tanstack/react-query"] } } },
        message: "Esta carpeta no usa React: {{ to.module.source }} va en components/, hooks/ o queries/",
      },
      {
        from: of("route", "feature", "feature-*", "ui", "theme", "test-utils"),
        disallow: { to: { module: { origin: "external", source: "@supabase/*" } } },
        message: "Solo src/lib/supabase.ts importa {{ to.module.source }}",
      },
    ],
  }],
};

export { boundaries };
```

- [ ] **Paso 6: Reemplazar `eslint.config.js`**

```js
import { fixupPluginRules } from "@eslint/compat";
import pluginQuery from "@tanstack/eslint-plugin-query";
import expo from "eslint-config-expo/flat.js";
import prettier from "eslint-config-prettier";
import checkFile from "eslint-plugin-check-file";
import importX from "eslint-plugin-import-x";
import a11y from "eslint-plugin-react-native-a11y";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

import { boundaries, structureRules, structureSettings } from "./eslint/structure.js";

// Un color completo (#rgb, #rrggbb, #rrggbbaa), un valor suelto de Tailwind ([#fff]) o rgb()/hsl(). «#0042» no coincide: es un número de pedido
const RAW_COLOR = "/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|\\[#[0-9a-fA-F]{3,8}\\]|\\b(?:rgba?|hsla?)\\(/";

export default tseslint.config(
  { ignores: ["node_modules/**", ".expo/**", "dist/**", "coverage/**", "docs/**", "templates/**", "tools/lint-fixtures/**", "src/types/database.ts"] },
  ...expo,
  ...pluginQuery.configs["flat/recommended"],
  {
    files: ["**/src/**/*.{ts,tsx}"],
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
    plugins: { boundaries, "check-file": checkFile, "import-x": importX, "react-native-a11y": fixupPluginRules(a11y) },
    settings: {
      ...structureSettings,
      ...importX.flatConfigs.typescript.settings,
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "import-x/resolver-next": [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      ...structureRules,
      "import-x/no-cycle": 2,
      "max-lines": [2, { max: 250, skipBlankLines: true, skipComments: true }],
      "react/no-multi-comp": 2,
      "no-console": 2,
      "@typescript-eslint/no-explicit-any": 2,
      "@typescript-eslint/ban-ts-comment": 2,
      "react-native-a11y/has-valid-accessibility-descriptors": 2,
      "check-file/filename-naming-convention": [2, { "**/src/!(app)/**/*.{ts,tsx}": "KEBAB_CASE" }, { ignoreMiddleExtensions: true }],
      "check-file/folder-naming-convention": [2, { "**/src/!(app)/**": "KEBAB_CASE" }],
      "no-restricted-syntax": [2,
        { selector: `Literal[value=${RAW_COLOR}]`, message: "Los colores van en src/theme" },
        { selector: `TemplateElement[value.raw=${RAW_COLOR}]`, message: "Los colores van en src/theme" },
      ],
    },
  },
  { files: ["**/src/theme/**"], rules: { "no-restricted-syntax": 0 } },
  {
    files: ["**/src/features/*/index.ts"],
    rules: { "no-restricted-syntax": [2, { selector: "ExportAllDeclaration", message: "En index.ts lo público se elige nombre por nombre" }] },
  },
  { files: ["**/*.test.{ts,tsx}"], languageOptions: { globals: globals.jest } },
  prettier,
);
```

Sin `...importX.flatConfigs.typescript.settings`, la regla de ciclos no ve los archivos `.ts` y pasa todo.

`.prettierrc.json`: `{ "printWidth": 120, "trailingComma": "all" }`. `.prettierignore`: `pnpm-lock.yaml`, `docs/design/`, `coverage/`, `.expo/`.

- [ ] **Paso 7: Correr todo y ver que pasa**

Corre: `pnpm lint:rules && pnpm lint && pnpm test`
Esperado:
- «Reglas de lint: 44 archivos, todo como se esperaba»;
- el lint del proyecto real sin errores ni advertencias;
- la prueba de la tarea 1 sigue pasando.

- [ ] **Paso 8: Commit**

```bash
git add -A
git commit -m "chore: enforce the folder structure with ESLint rules and self-testing fixtures"
```

---

### Task 3: El tema claro y oscuro, la letra y los estilos

**Archivos:**
- Crear: `src/theme/colors.json`, `src/theme/tokens.ts`, `src/theme/theme-provider.tsx`, `src/theme/use-theme.ts`, `src/theme/index.ts`, `src/test/render.tsx`, `tailwind.config.js`, `global.css`, `babel.config.js`, `metro.config.js`, `nativewind-env.d.ts`
- Modificar: `src/app/_layout.tsx`, `src/app/index.tsx`
- Pruebas: `src/theme/tokens.test.ts`, `src/theme/theme-provider.test.tsx`

**Interfaces:**
- Produce:

```ts
// src/theme/tokens.ts
export type ColorName = keyof typeof colorsJson.light;          // 35 nombres
export type ThemeColors = Record<ColorName, string>;
export const lightColors: ThemeColors;
export const darkColors: ThemeColors;
export const radii = { sm: 12, md: 16, lg: 20, xl: 26 } as const;
export const fonts = {
  regular: "Manrope_400Regular", medium: "Manrope_500Medium", semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold", extrabold: "Manrope_800ExtraBold",
} as const;

// src/theme/theme-provider.tsx
export type Scheme = "light" | "dark";
export function ThemeProvider(props: { children: ReactNode; forcedScheme?: Scheme }): JSX.Element;

// src/theme/use-theme.ts
export function useTheme(): { scheme: Scheme; colors: ThemeColors };

// src/test/render.tsx
export function renderWithProviders(ui: ReactElement, options?: { scheme?: Scheme }): Promise<RenderResult>;
```

- `src/theme/index.ts` exporta por nombre todo lo anterior, menos `renderWithProviders`.
- `src/theme/colors.json` es la única fuente de los colores: la leen `tokens.ts` y `tailwind.config.js`.

Los 35 colores salen de la maqueta (`:root` y `body.oscuro .app` en `donpipos.css`):

| Nombre | Claro | Oscuro | En la maqueta |
|---|---|---|---|
| `background` | `#faf7e9` | `#121710` | `--fondo` |
| `surface` | `#ffffff` | `#1b2318` | `--papel` |
| `sunken` | `#f2eedd` | `#222c1e` | `--hundido` |
| `border` | `#e8e2cd` | `#2c3828` | `--linea` |
| `borderStrong` | `#d6cdb2` | `#3c4a36` | `--linea-f` |
| `text` | `#22301f` | `#eef0e4` | `--tinta` |
| `textSecondary` | `#4c5743` | `#c3c9b6` | `--tinta-2` |
| `textMuted` | `#646d5a` | `#9ba392` | `--tinta-3` |
| `primary` | `#354b2e` | `#4e6d43` | `--bosque` |
| `primaryDeep` | `#283a22` | `#3d5635` | `--bosque-hondo` |
| `primaryLight` | `#4a6340` | `#628553` | `--bosque-luz` |
| `accent` | `#354b2e` | `#a8cb94` | `--acento` |
| `brand` | `#354b2e` | `#2b3f25` | `--marca` |
| `onPrimary` | `#faf7e9` | `#faf7e9` | `--crema` |
| `caramel` | `#d5ae88` | `#d5ae88` | `--caramelo` |
| `caramelSoft` | `#f5eadc` | `#3a2e21` | `--caramelo-suave` |
| `caramelText` | `#7a5026` | `#e8c8a5` | `--caramelo-tinta` |
| `olive` | `#6e7b52` | `#b6c294` | `--oliva` |
| `oliveSoft` | `#e9eedc` | `#283020` | `--oliva-suave` |
| `danger` | `#b23f26` | `#f08c71` | `--coral` |
| `dangerSoft` | `#fbe3db` | `#3f221a` | `--coral-suave` |
| `warning` | `#86560e` | `#e9ba69` | `--ambar` |
| `warningSoft` | `#faeacb` | `#3b2e16` | `--ambar-suave` |
| `statusNewBg`, `statusNewText` | `#e6ecf7`, `#2b4c86` | `#1e2a40`, `#adc5f2` | `--nuevo`, `--nuevo-t` |
| `statusPreparingBg`, `statusPreparingText` | `#f6e7d3`, `#7a5026` | `#3b2c1b`, `#ecc9a0` | `--preparando`, `--preparando-t` |
| `statusOnTheWayBg`, `statusOnTheWayText` | `#dff0ec`, `#1d6658` | `#14332d`, `#8fd6c4` | `--camino`, `--camino-t` |
| `statusReadyBg`, `statusReadyText` | `#e9f1da`, `#47621e` | `#243118`, `#bfdb95` | `--listo`, `--listo-t` |
| `statusDeliveredBg`, `statusDeliveredText` | `#ecebe4`, `#555a4c` | `#2a2e27`, `#c7cbbd` | `--entregado`, `--entregado-t` |
| `statusCancelledBg`, `statusCancelledText` | `#fadfd7`, `#a5371c` | `#3f2017`, `#f3aa93` | `--anulado`, `--anulado-t` |

Los colores de los medios de pago (`--m-yape` y los demás) se agregan en la fase 4, cuando haga falta dibujarlos.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`src/theme/tokens.test.ts`:

```ts
import { darkColors, lightColors, radii } from "@/theme/tokens";

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const PAIRS = [
  ["text", "background"], ["text", "surface"], ["text", "sunken"],
  ["textSecondary", "background"], ["textSecondary", "surface"],
  ["textMuted", "background"], ["textMuted", "surface"],
  ["onPrimary", "primary"], ["onPrimary", "brand"],
  ["accent", "background"], ["accent", "surface"],
  ["danger", "background"], ["danger", "surface"], ["danger", "dangerSoft"],
  ["warning", "warningSoft"], ["caramelText", "caramelSoft"], ["olive", "surface"],
  ["statusNewText", "statusNewBg"], ["statusPreparingText", "statusPreparingBg"],
  ["statusOnTheWayText", "statusOnTheWayBg"], ["statusReadyText", "statusReadyBg"],
  ["statusDeliveredText", "statusDeliveredBg"], ["statusCancelledText", "statusCancelledBg"],
] as const;

test("claro y oscuro tienen los mismos 35 colores, todos en #rrggbb", () => {
  expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  expect(Object.keys(lightColors)).toHaveLength(35);
  for (const value of [...Object.values(lightColors), ...Object.values(darkColors)]) expect(value).toMatch(/^#[0-9a-f]{6}$/);
});

test("los colores son los de la maqueta", () => {
  expect(lightColors.primary).toBe("#354b2e");
  expect(lightColors.background).toBe("#faf7e9");
  expect(darkColors.background).toBe("#121710");
  expect(darkColors.accent).toBe("#a8cb94");
  expect(darkColors.brand).toBe("#2b3f25");
  expect(radii).toEqual({ sm: 12, md: 16, lg: 20, xl: 26 });
});

test.each(PAIRS)("%s sobre %s se lee en claro y en oscuro (contraste de 4.5 o más)", (fg, bg) => {
  expect(contrast(lightColors[fg], lightColors[bg])).toBeGreaterThanOrEqual(4.5);
  expect(contrast(darkColors[fg], darkColors[bg])).toBeGreaterThanOrEqual(4.5);
});
```

`src/theme/theme-provider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { darkColors, lightColors, ThemeProvider, useTheme } from "@/theme";

function Probe() {
  const { scheme, colors } = useTheme();
  return <Text>{`${scheme}:${colors.background}`}</Text>;
}

test("forzado a oscuro, entrega los colores oscuros", async () => {
  await render(<ThemeProvider forcedScheme="dark"><Probe /></ThemeProvider>);
  expect(screen.getByText(`dark:${darkColors.background}`)).toBeOnTheScreen();
});

test("sin forzar, sigue el modo del celular (claro en las pruebas)", async () => {
  await render(<ThemeProvider><Probe /></ThemeProvider>);
  expect(screen.getByText(`light:${lightColors.background}`)).toBeOnTheScreen();
});

test("useTheme fuera del ThemeProvider avisa con un error claro", async () => {
  const quiet = jest.spyOn(console, "error").mockImplementation(() => undefined); // React también lo registra en consola
  await expect(render(<Probe />)).rejects.toThrow("useTheme necesita un ThemeProvider");
  quiet.mockRestore();
});
```

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/theme`
Esperado: FALLA con «Cannot find module '@/theme/tokens'».

- [ ] **Paso 3: Crear el tema**

- `colors.json`: `{ "light": { … }, "dark": { … } }`, con los 35 nombres de la tabla en cada uno.
- `tokens.ts`: importa `colors.json` y exporta lo de «Interfaces».
- `use-theme.ts`: lee el contexto. Si no hay, lanza `new Error("useTheme necesita un ThemeProvider")`.
- `theme-provider.tsx`: el modo es `forcedScheme` o, si no viene, `useColorScheme()` de `react-native` (`"dark"` → oscuro; cualquier otro valor → claro).
- `src/test/render.tsx`: `renderWithProviders` envuelve en `ThemeProvider` con `forcedScheme = options?.scheme`.

- [ ] **Paso 4: Correr las pruebas y ver que pasan**

Corre: `pnpm test src/theme`
Esperado: PASAN las 3 pruebas de `tokens.test.ts`, incluidos los 23 pares de contraste, y las 3 de `theme-provider.test.tsx`.

- [ ] **Paso 5: Instalar la letra y NativeWind**

```bash
npx expo install @expo-google-fonts/manrope expo-font expo-splash-screen react-native-reanimated react-native-safe-area-context
pnpm add nativewind@^4.2.7 && pnpm add -D tailwindcss@^3.4
```

- `tailwind.config.js`:
  - `presets: [require("nativewind/preset")]` y `content: ["./src/**/*.{ts,tsx}"]`;
  - `theme.extend.colors`: por cada nombre de `colors.json`, su nombre en kebab-case apunta a `var(--color-<nombre>)`. Por ejemplo, `"text-secondary": "var(--color-text-secondary)"`;
  - `theme.extend.fontFamily`: `regular`, `medium`, `semibold`, `bold` y `extrabold`, con los nombres de `fonts`;
  - `theme.extend.borderRadius`: `sm`, `md`, `lg` y `xl`, con los valores de `radii`.
- `global.css`: las tres directivas `@tailwind`.
- `babel.config.js`: `presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"]`.
- `metro.config.js`: `withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" })`.
- `nativewind-env.d.ts`: `/// <reference types="nativewind/types" />`.
- `theme-provider.tsx`: envuelve a los hijos en un `View` con `flex: 1` y `vars({ "--color-<nombre>": valor })` de `nativewind`, con los colores del modo activo.
- `_layout.tsx`:
  - importa `../../global.css`;
  - carga las cinco fuentes con `useFonts`;
  - mantiene la pantalla de carga con `SplashScreen.preventAutoHideAsync()` hasta que estén;
  - envuelve el `Stack` en `ThemeProvider`.
- `index.tsx`: fondo `bg-background`, el logo (`assets/icon.png`, 96 px, redondo), «Don Pipos» en `font-extrabold text-text` y «Fase 0 lista» en `text-text-secondary`.

- [ ] **Paso 6: Comprobar NativeWind en Expo 58 y decidir**

NativeWind 4 declara soporte hasta SDK 57. Se queda si cumple las tres:
1. `pnpm test && pnpm typecheck && pnpm lint` pasan.
2. En Expo Go sobre Android (`pnpm start --tunnel`), la portada se ve con fondo crema, el logo y «Don Pipos» en Manrope ExtraBold.
3. Al poner el celular en modo oscuro, la portada cambia a fondo `#121710` sin recargar.

**Si alguna falla** después de seguir la guía oficial de NativeWind:
- quita `nativewind`, `tailwindcss`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts` y lo agregado a `babel.config.js` y `metro.config.js`;
- `ThemeProvider` deja de usar `vars`, y los componentes usan `StyleSheet` con `useTheme()`, `fonts` y `radii`;
- cambia la fila «Estilos» de `docs/PROJECT_CONTEXT.md` §14 a «`StyleSheet` con el tema; NativeWind 4 no funcionó en SDK 58».

Las pruebas de los pasos 1 a 4 no cambian en ningún caso.

- [ ] **Paso 7: Commit**

```bash
git add -A
git commit -m "feat: add light and dark theme tokens, Manrope and the styling setup"
```

---

### Task 4: Lo común de `lib`: errores, montos y fechas

**Archivos:**
- Crear: `src/lib/errors.ts`, `src/lib/money.ts`, `src/lib/dates.ts`
- Pruebas: `src/lib/errors.test.ts`, `src/lib/money.test.ts`, `src/lib/dates.test.ts`

**Interfaces:**
- Produce:

```ts
// src/lib/errors.ts
export type AppErrorKind = "offline" | "notFound" | "forbidden" | "invalid" | "conflict" | "unexpected";
export class AppError extends Error {
  readonly kind: AppErrorKind;
  constructor(kind: AppErrorKind, options?: { cause?: unknown });
}
export function toAppError(error: unknown): AppError;
export function errorMessage(error: AppError): string;
export function isRetryable(error: AppError): boolean;

// src/lib/money.ts
export function formatCents(cents: number): string;
export function parseSoles(text: string): number | null;

// src/lib/dates.ts
export const TIME_ZONE = "America/Lima";
export function businessDate(instant: Date): string;                           // "2026-11-18"
export function businessDayRange(date: string): { from: Date; to: Date };      // [00:00 de Lima, 00:00 del día siguiente)
export function formatLongDate(instant: Date): string;                         // "Miércoles 18 de noviembre"
export function formatTime(instant: Date): string;                             // "11:40"
```

- **El contrato de errores con la base** (`docs/spec/README.md`): las funciones avisan con `raise exception using errcode = 'P0001', message = '<código>'`, donde el código es `invalid`, `not_found`, `forbidden` o `conflict`.

Cómo convierte `toAppError`, en este orden:

| Llega | Sale |
|---|---|
| Un `AppError` | El mismo |
| Un `TypeError` cuyo mensaje contiene `Network request failed` o `Failed to fetch` | `offline` |
| `{ code: "P0001", message }` con `message` igual a `invalid`, `not_found`, `forbidden` o `conflict` | `invalid`, `notFound`, `forbidden` o `conflict` |
| `{ code: "42501" }` o `{ code: "PGRST301" }` | `forbidden` |
| `{ code: "23505" }` | `conflict` |
| `{ code: "PGRST116" }` | `notFound` |
| Cualquier otra cosa (un texto, `null`, un objeto sin `code`) | `unexpected`, con lo recibido en `cause` |

Los textos de `errorMessage`, exactos:

| Tipo | Texto |
|---|---|
| `offline` | «Sin conexión. Revisa tu señal y vuelve a intentar.» |
| `notFound` | «No encontramos lo que buscabas. Puede que ya no exista.» |
| `forbidden` | «No tienes permiso para hacer esto. Vuelve a ingresar.» |
| `invalid` | «Hay un dato que no es válido. Revísalo y vuelve a intentar.» |
| `conflict` | «Alguien cambió esto antes. Actualiza y vuelve a intentar.» |
| `unexpected` | «Algo salió mal de nuestro lado. Vuelve a intentar en un momento.» |

`isRetryable` es `true` solo para `offline` y `unexpected`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`src/lib/errors.test.ts`:

```ts
import { AppError, errorMessage, isRetryable, toAppError } from "@/lib/errors";

test("un AppError pasa igual", () => {
  const error = new AppError("conflict");
  expect(toAppError(error)).toBe(error);
});

test.each([
  [new TypeError("Network request failed"), "offline"],
  [new TypeError("Failed to fetch"), "offline"],
  [{ code: "P0001", message: "invalid" }, "invalid"],
  [{ code: "P0001", message: "not_found" }, "notFound"],
  [{ code: "P0001", message: "forbidden" }, "forbidden"],
  [{ code: "P0001", message: "conflict" }, "conflict"],
  [{ code: "42501", message: "permission denied for table orders" }, "forbidden"],
  [{ code: "PGRST301", message: "JWT expired" }, "forbidden"],
  [{ code: "23505", message: "duplicate key value" }, "conflict"],
  [{ code: "PGRST116", message: "0 rows" }, "notFound"],
  [{ code: "P0001", message: "otra cosa" }, "unexpected"],
  ["boom", "unexpected"],
  [null, "unexpected"],
  [{ raro: true }, "unexpected"],
])("%p se convierte en %s", (input, kind) => {
  expect(toAppError(input).kind).toBe(kind);
});

test("lo inesperado guarda lo recibido y nunca lo muestra", () => {
  const error = toAppError({ code: "XX000", message: "relation \"orders\" does not exist" });
  expect(error.cause).toEqual({ code: "XX000", message: "relation \"orders\" does not exist" });
  expect(errorMessage(error)).toBe("Algo salió mal de nuestro lado. Vuelve a intentar en un momento.");
});

test.each([
  ["offline", "Sin conexión. Revisa tu señal y vuelve a intentar."],
  ["notFound", "No encontramos lo que buscabas. Puede que ya no exista."],
  ["forbidden", "No tienes permiso para hacer esto. Vuelve a ingresar."],
  ["invalid", "Hay un dato que no es válido. Revísalo y vuelve a intentar."],
  ["conflict", "Alguien cambió esto antes. Actualiza y vuelve a intentar."],
  ["unexpected", "Algo salió mal de nuestro lado. Vuelve a intentar en un momento."],
] as const)("el texto de %s", (kind, text) => {
  expect(errorMessage(new AppError(kind))).toBe(text);
});

test("solo se reintenta sin conexión o ante algo inesperado", () => {
  expect(["offline", "unexpected"].map((k) => isRetryable(new AppError(k as "offline")))).toEqual([true, true]);
  expect(["notFound", "forbidden", "invalid", "conflict"].map((k) => isRetryable(new AppError(k as "invalid")))).toEqual([false, false, false, false]);
});
```

`src/lib/money.test.ts` (` ` es el espacio que no se corta y `−` el signo menos):

```ts
import { formatCents, parseSoles } from "@/lib/money";

test.each([
  [1200, "S/ 12.00"],
  [5, "S/ 0.05"],
  [0, "S/ 0.00"],
  [124550, "S/ 1,245.50"],
  [123456789, "S/ 1,234,567.89"],
  [-1800, "−S/ 18.00"],
])("formatCents(%i) es %s", (cents, text) => {
  expect(formatCents(cents)).toBe(text);
});

test.each([
  ["12", 1200], ["12.5", 1250], ["12,5", 1250], ["12,50", 1250], ["0.05", 5],
  [" 7 ", 700], ["12.", 1200], [".5", 50], ["0", 0],
])("parseSoles(%p) es %i", (text, cents) => {
  expect(parseSoles(text)).toBe(cents);
});

test.each(["", "   ", "abc", "-3", "12.345", "1,245.50", "1.2.3", "12a", "S/ 12", "."])("parseSoles(%p) no es un monto", (text) => {
  expect(parseSoles(text)).toBeNull();
});
```

`src/lib/dates.test.ts`:

```ts
import { businessDate, businessDayRange, formatLongDate, formatTime, TIME_ZONE } from "@/lib/dates";

test("la zona es la de Lima", () => {
  expect(TIME_ZONE).toBe("America/Lima");
});

test("a las 23:59 de Lima sigue siendo el mismo día; a las 00:00 ya es el siguiente", () => {
  expect(businessDate(new Date("2026-11-19T04:59:59Z"))).toBe("2026-11-18");
  expect(businessDate(new Date("2026-11-19T05:00:00Z"))).toBe("2026-11-19");
});

test("el día va de las 00:00 de Lima a las 00:00 del día siguiente", () => {
  const { from, to } = businessDayRange("2026-11-18");
  expect(from.toISOString()).toBe("2026-11-18T05:00:00.000Z");
  expect(to.toISOString()).toBe("2026-11-19T05:00:00.000Z");
});

test("las fechas se escriben en español de Perú", () => {
  const instant = new Date("2026-11-18T16:40:00Z");
  expect(formatLongDate(instant)).toBe("Miércoles 18 de noviembre");
  expect(formatTime(instant)).toBe("11:40");
});
```

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/lib`
Esperado: FALLAN las tres con «Cannot find module».

- [ ] **Paso 3: Crear `errors.ts`, `money.ts` y `dates.ts`**

```bash
pnpm add date-fns@^4 @date-fns/tz@^1
```

- `money.ts`: el formato se arma a mano, sin `Intl`, para que salga igual en todos los celulares. `parseSoles` acepta solo dígitos con un separador decimal opcional («,» o «.») y hasta 2 decimales.
- `dates.ts`: con `TZDate` y `tz(TIME_ZONE)` de `@date-fns/tz`, y `format` de `date-fns` con el locale `es`. `formatLongDate` pone en mayúscula la primera letra.

- [ ] **Paso 4: Correr las pruebas y la cobertura**

Corre: `pnpm test:coverage`
Esperado: todas las pruebas pasan y la cobertura es del 100 % en `errors.ts`, `money.ts`, `dates.ts` y `tokens.ts`.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add shared error, money and date helpers"
```

---

### Task 5: TanStack Query: el cliente, la señal, el foco y la caché guardada

**Archivos:**
- Crear: `src/lib/query.ts`
- Modificar: `src/app/_layout.tsx`, `src/test/render.tsx`
- Prueba: `src/lib/query.test.ts`

**Interfaces:**
- Consume: `AppError`, `toAppError` e `isRetryable` de `@/lib/errors` (tarea 4); `ThemeProvider` (tarea 3).
- Produce:

```ts
// src/lib/query.ts
export const STALE_TIME = { catalog: 30 * 60_000, live: 30_000, reports: 5 * 60_000 } as const;
export const CACHE_MAX_AGE = 24 * 60 * 60_000;
export function createQueryClient(options?: { onError?: (error: AppError) => void }): QueryClient;
export function setupOnlineManager(): void;   // expo-network → onlineManager
export function setupFocusManager(): void;    // AppState → focusManager
export function createPersistOptions(buster: string): { persister: Persister; maxAge: number; buster: string };

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AppError;
    mutationMeta: { invalidates?: QueryKey[] };
  }
}

// src/test/render.tsx (se amplía)
export function renderWithProviders(
  ui: ReactElement,
  options?: { scheme?: Scheme },
): Promise<RenderResult & { queryClient: QueryClient }>;
```

Lo que fija `createQueryClient` (`PROJECT_CONTEXT.md` §14.2):
- **Consultas:** `staleTime: STALE_TIME.live`, `gcTime: CACHE_MAX_AGE` y `retry: (count, error) => isRetryable(error) && count < 2`.
- **Mutaciones:** `retry: false`.
- **`QueryCache.onError` y `MutationCache.onError`:** pasan `toAppError(error)` a `options.onError`.
- **`MutationCache.onSuccess`:** invalida cada clave de `mutation.meta.invalidates`.

- [ ] **Paso 1: Escribir la prueba que falla**

`src/lib/query.test.ts`:

```ts
import { focusManager, MutationObserver, onlineManager, QueryObserver } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";

import { AppError } from "@/lib/errors";
import { CACHE_MAX_AGE, createQueryClient, setupFocusManager, setupOnlineManager, STALE_TIME } from "@/lib/query";

jest.mock("expo-network", () => ({ addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })) }));

test("los tiempos de vida son los del documento", () => {
  expect(STALE_TIME).toEqual({ catalog: 1_800_000, live: 30_000, reports: 300_000 });
  expect(CACHE_MAX_AGE).toBe(86_400_000);
  const defaults = createQueryClient().getDefaultOptions();
  expect(defaults.queries?.staleTime).toBe(30_000);
  expect(defaults.queries?.gcTime).toBe(86_400_000);
  expect(defaults.mutations?.retry).toBe(false);
});

test("reintenta hasta 2 veces sin conexión y nunca un dato inválido", () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry as (count: number, error: AppError) => boolean;
  expect(retry(0, new AppError("offline"))).toBe(true);
  expect(retry(1, new AppError("unexpected"))).toBe(true);
  expect(retry(2, new AppError("offline"))).toBe(false);
  expect(retry(0, new AppError("invalid"))).toBe(false);
  expect(retry(0, new AppError("forbidden"))).toBe(false);
});

test("un error de una consulta llega convertido en AppError", async () => {
  const onError = jest.fn();
  const client = createQueryClient({ onError });
  const observer = new QueryObserver(client, { queryKey: ["x"], queryFn: () => Promise.reject({ code: "P0001", message: "conflict" }), retry: false });
  await observer.refetch();
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: "conflict" }));
});

test("una mutación refresca las claves que declara", async () => {
  const client = createQueryClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const observer = new MutationObserver(client, { mutationFn: () => Promise.resolve(1), meta: { invalidates: [["orders"], ["stock"]] } });
  await observer.mutate();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["orders"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["stock"] });
});

test("la señal del celular mueve onlineManager", () => {
  setupOnlineManager();
  const listener = jest.mocked(Network.addNetworkStateListener).mock.calls[0]![0];
  listener({ isConnected: false } as Network.NetworkState);
  expect(onlineManager.isOnline()).toBe(false);
  listener({ isConnected: true } as Network.NetworkState);
  expect(onlineManager.isOnline()).toBe(true);
});

test("volver a la app mueve focusManager", () => {
  const add = jest.spyOn(AppState, "addEventListener");
  setupFocusManager();
  const listener = add.mock.calls[0]![1];
  listener("background");
  expect(focusManager.isFocused()).toBe(false);
  listener("active");
  expect(focusManager.isFocused()).toBe(true);
});
```

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `pnpm test src/lib/query`
Esperado: FALLA con «Cannot find module '@/lib/query'».

- [ ] **Paso 3: Instalar y crear `src/lib/query.ts`**

```bash
npx expo install expo-network @react-native-async-storage/async-storage expo-constants
pnpm add @tanstack/react-query@^5 @tanstack/react-query-persist-client@^5 @tanstack/query-async-storage-persister@^5
```

`createPersistOptions(buster)` usa `createAsyncStoragePersister({ storage: AsyncStorage })` y `maxAge: CACHE_MAX_AGE`.

- [ ] **Paso 4: Conectar el layout y la ayuda de pruebas**

- `_layout.tsx`:
  - crea un solo `queryClient` con `createQueryClient()`, fuera del componente;
  - llama una vez a `setupOnlineManager()` y a `setupFocusManager()`;
  - envuelve todo en `PersistQueryClientProvider`, con `createPersistOptions(Constants.expoConfig?.version ?? "0")`.
- `src/test/render.tsx`: en cada llamada crea un `QueryClient` nuevo con `createQueryClient()`, le pone `retry: false` a las consultas, envuelve en `QueryClientProvider` y devuelve también `queryClient`.

- [ ] **Paso 5: Correr todo y ver que pasa**

Corre: `pnpm test && pnpm typecheck && pnpm lint`
Esperado: todas las pruebas pasan, sin errores de tipos ni de lint.

- [ ] **Paso 6: Commit**

```bash
git add -A
git commit -m "feat: add the TanStack Query client with network, focus and persisted cache"
```

---

### Task 6: La plantilla de un módulo y su generador

**Archivos:**
- Crear: `templates/feature/index.ts.tpl`, `templates/feature/queries/keys.ts.tpl`, `templates/feature/{api,schema,rules,hooks,components}/.gitkeep`, `scripts/new-feature.mjs`
- Modificar: `package.json` (scripts `new:feature` y `test:scripts`)
- Prueba: `scripts/new-feature.test.mjs`

**Interfaces:**
- Produce: `pnpm new:feature <nombre>`, que crea `src/features/<nombre>/` con las seis carpetas (`api`, `queries`, `schema`, `rules`, `hooks`, `components`) y dos archivos:
  - `index.ts`: un comentario con el nombre del módulo y `export {};`;
  - `queries/keys.ts`: `export const <nombreCamel>Keys = { all: ["<nombre>"] as const };`.
- `scripts/new-feature.mjs` también exporta `createFeature(name: string, root: string): string[]`, que devuelve los archivos creados, para poder probarlo.
- Códigos de salida: 0 si lo creó; 1 con un mensaje en español si el nombre no vale o si el módulo ya existe.

Un nombre vale si coincide con `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`.

- [ ] **Paso 1: Escribir la prueba que falla**

`scripts/new-feature.test.mjs` (corre con `node --test`):

```js
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createFeature } from "./new-feature.mjs";

const root = () => mkdtempSync(join(tmpdir(), "features-"));

test("crea el módulo con sus seis carpetas, el índice y las claves", () => {
  const dir = root();
  createFeature("cash-counts", dir);
  for (const folder of ["api", "queries", "schema", "rules", "hooks", "components"]) assert.ok(existsSync(join(dir, "cash-counts", folder)), folder);
  assert.match(readFileSync(join(dir, "cash-counts", "index.ts"), "utf8"), /export \{\};/);
  assert.match(readFileSync(join(dir, "cash-counts", "queries", "keys.ts"), "utf8"), /export const cashCountsKeys = \{ all: \["cash-counts"\] as const \};/);
});

test("rechaza los nombres que no son kebab-case", () => {
  for (const name of ["Orders", "cash_counts", "2fast", "orders/", ""]) assert.throws(() => createFeature(name, root()), /kebab-case/);
});

test("no pisa un módulo que ya existe", () => {
  const dir = root();
  createFeature("orders", dir);
  assert.throws(() => createFeature("orders", dir), /ya existe/);
});
```

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `node --test scripts/`
Esperado: FALLA con «Cannot find module … new-feature.mjs».

- [ ] **Paso 3: Crear la plantilla y `scripts/new-feature.mjs`**

- En las plantillas, `__name__` se reemplaza por el nombre y `__camel__` por el nombre en camelCase.
- Si se corre directo (`pnpm new:feature orders`), usa `src/features` como raíz e imprime los archivos creados.

Agrega a `package.json`: `"new:feature": "node scripts/new-feature.mjs"` y `"test:scripts": "node --test scripts/"`.

- [ ] **Paso 4: Correr las pruebas y probar un módulo de verdad**

Corre:

```bash
pnpm test:scripts
pnpm new:feature demo-module && pnpm lint && pnpm typecheck; rm -rf src/features/demo-module
```

Esperado: las 3 pruebas pasan, y el módulo recién creado pasa el lint y los tipos sin tocarlo.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "chore: add the feature template and its generator"
```

---

### Task 7: Commits vigilados, CI y las reglas del repositorio

**Archivos:**
- Crear: `lefthook.yml`, `commitlint.config.js`, `.github/workflows/ci.yml`, `CLAUDE.md`, `.env.example`

**Interfaces:**
- Produce: un commit solo entra si pasan el lint, los tipos, las pruebas, el formato, la búsqueda de secretos y el formato del mensaje. En GitHub corre lo mismo, más la cobertura.

- [ ] **Paso 1 (lo hace el dueño del proyecto): instalar gitleaks**

Es un programa aparte, no un paquete de npm:

```bash
mkdir -p ~/.local/bin && cd /tmp
curl -sLO https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
tar xzf gitleaks_8.30.1_linux_x64.tar.gz gitleaks && mv gitleaks ~/.local/bin/ && gitleaks version
```

Esperado: `8.30.1`.

- [ ] **Paso 2: Instalar y configurar los hooks**

```bash
pnpm add -D lefthook @commitlint/cli @commitlint/config-conventional
```

`commitlint.config.js`:

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "chore", "refactor", "test"]],
    "header-max-length": [2, "always", 100],
    "body-empty": [2, "always"],
    "footer-empty": [2, "always"],
  },
};
```

`lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  commands:
    secrets:
      run: gitleaks git --pre-commit --staged --redact --no-banner
    format:
      glob: "*.{ts,tsx,js,mjs,json,md,yml}"
      run: pnpm exec prettier --check {staged_files}
    lint:
      run: pnpm lint && pnpm lint:rules
    types:
      run: pnpm typecheck
    tests:
      run: pnpm test && pnpm test:scripts
commit-msg:
  commands:
    message:
      run: pnpm exec commitlint --edit {1}
```

Después: `pnpm exec lefthook install`.

- [ ] **Paso 3: Comprobar que los hooks bloquean**

Corre cada uno y mira el resultado:

```bash
echo "feat: add the order list" | pnpm exec commitlint                              # pasa
echo "feature: add the order list" | pnpm exec commitlint                           # falla: type-enum
printf 'feat: add the order list\n\nwith a body\n' | pnpm exec commitlint           # falla: body-empty
echo "feat: $(printf 'a%.0s' {1..100})" | pnpm exec commitlint                      # falla: header-max-length
printf 'token=ghp_%s\n' "$(openssl rand -hex 18)" > leak.txt && git add leak.txt      # una llave falsa, hecha al momento
gitleaks git --pre-commit --staged --redact --no-banner; echo "salida: $?"          # salida distinta de 0
git rm -q --cached leak.txt && rm leak.txt
```

- [ ] **Paso 4: Escribir el CI, `CLAUDE.md` y `.env.example`**

- **`.github/workflows/ci.yml`:** en cada `push` y `pull_request`, con Node 24 y pnpm 10 (`pnpm install --frozen-lockfile`), corre en este orden:
  1. `pnpm lint`;
  2. `pnpm lint:rules`;
  3. `pnpm typecheck`;
  4. `pnpm test:coverage`;
  5. `pnpm test:scripts`;
  6. gitleaks sobre toda la historia: descarga la versión 8.30.1 y corre `gitleaks git --redact --no-banner`. Necesita `fetch-depth: 0` en el checkout.
- **`.env.example`:** `EXPO_PUBLIC_SUPABASE_URL=` y `EXPO_PUBLIC_SUPABASE_KEY=`, con un comentario: la llave es la publicable (`sb_publishable_…`) y nunca la secreta. Las usa la fase 2.
- **`CLAUDE.md`,** en español, con estas secciones:
  1. **Mapa de documentos:** `docs/PROJECT_CONTEXT.md`, `docs/glossary.md`, `docs/spec/`, `docs/plan/` y `docs/design/pantallas/`.
  2. **Reglas que no se negocian:**
     - las 18 reglas de §10.1, en una línea cada una;
     - no inventar datos del negocio;
     - nunca pedir ni escribir la llave secreta.
  3. **Dónde va cada cosa:** la tabla de §10.3.
  4. **Comandos:** `pnpm lint`, `lint:rules`, `typecheck`, `test`, `test:coverage`, `new:feature` y `start --tunnel`.
  5. **Commits:** en inglés, Conventional Commits, hasta 100 caracteres, sin cuerpo.
  6. **Antes de escribir código de Expo o de una librería:** leer su documentación de la versión instalada.

- [ ] **Paso 5: Commit, que ya pasa por los hooks**

```bash
git add -A
git commit -m "chore: add commit hooks, CI and the repository rules"
```

Esperado: los cinco comandos de `pre-commit` y el de `commit-msg` pasan, y el commit entra.

---

### Task 8: En el celular, y el cierre de la fase

**Archivos:**
- Modificar: `docs/plan/README.md` (estado), `docs/PROJECT_CONTEXT.md` (§14 y §16)

- [ ] **Paso 1: Abrir la app en el celular**

```bash
pnpm add -D @expo/ngrok && pnpm start --tunnel
```

Con Expo Go en el celular Android del dueño del proyecto, comprueba:
1. La app abre y muestra el logo, «Don Pipos» y «Fase 0 lista», con fondo crema.
2. La letra es Manrope, no la del sistema.
3. Con el celular en modo oscuro, la portada cambia a oscuro sin recargar.
4. Con la letra del celular en grande, los textos crecen y nada se corta.

- [ ] **Paso 2: Anotar los resultados**

- En `docs/PROJECT_CONTEXT.md` §14, fila «Estilos»: queda «NativeWind 4, comprobado en SDK 58» o lo que dice el plan B de la tarea 3.
- En `docs/plan/README.md`: la fase 0 pasa a «Hecha», con la fecha.
- Si algo se resolvió distinto de lo que dice este plan, anótalo aquí debajo, en una sección «Lo que cambió».

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "docs: record phase 0 results and the styling decision"
```

Con esto, la fase 0 está terminada. Sigue escribir el plan de la fase 1.

---

## Resultado (2026-11-19)

La fase 0 quedó construida en la rama `fase-0`, con un commit por tarea. Esta tabla es la del cierre de la fase; después hubo una revisión final con correcciones, y cómo quedó todo está al final, en «Después de la revisión final».

| Comprobación | Resultado |
|---|---|
| `pnpm lint` | Sin errores ni avisos |
| `pnpm lint:rules` | Las reglas atrapan lo que deben, en 46 archivos de prueba |
| `pnpm typecheck` | Sin errores |
| `pnpm test:coverage` | 98 pruebas; 100 % en `lib/{money,dates,errors}` y `theme/tokens` |
| `pnpm test:scripts` | 5 pruebas del generador de módulos |
| CI | Simulado en una copia limpia del repositorio: pasan todos los pasos menos gitleaks, que no se pudo correr |
| Android | El paquete compila y el servidor de desarrollo entrega la app tal como la pide Expo Go (1,882 módulos, sin errores) |
| Estilos | En la versión web, los colores de la maqueta en claro y en oscuro, con Manrope |

### Lo que falta

Son dos pasos del dueño del proyecto. Ninguno cambia código.

**1. Instalar gitleaks y activar los hooks.** **Postergado por el dueño del proyecto el 2026-11-19; se retoma antes de la fase 2,** que es cuando aparece la primera llave secreta. El sistema de permisos no dejó que el asistente descargara el programa, así que los hooks están escritos y probados uno por uno, pero todavía no revisan los commits. Mientras tanto, en esta máquina las llaves las cuida `.gitignore`, que deja fuera todo archivo `.env` salvo la plantilla `.env.example`.

```bash
mkdir -p ~/.local/bin && cd /tmp
curl -sLO https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
tar xzf gitleaks_8.30.1_linux_x64.tar.gz gitleaks && mv gitleaks ~/.local/bin/ && gitleaks version
cd /home/javier/var-mar/app && pnpm exec lefthook install
```

Esperado: `8.30.1` y «sync hooks: ✔️(commit-msg, pre-commit)». Para ver que bloquea una llave (es falsa, hecha al momento):

```bash
printf 'token=ghp_%s\n' "$(openssl rand -hex 18)" > leak.txt && git add leak.txt
gitleaks git --pre-commit --staged --redact --no-banner; echo "salida: $?"   # distinta de 0
git rm -q --cached leak.txt && rm leak.txt
```

**2. Abrir la app en el celular.** Con Expo Go instalado en el Android:

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

Escanea el código y comprueba:
1. La app abre y muestra el logo, «Don Pipos» y «Fase 0 lista», con fondo crema.
2. La letra es Manrope, no la del sistema.
3. Con el celular en modo oscuro, la portada cambia a oscuro sin recargar.
4. Con la letra del celular en grande, los textos crecen y nada se corta.
5. Debajo de «Fase 0 lista» sale la fecha de hoy escrita en español, por ejemplo «Jueves 19 de noviembre».

Si las cuatro primeras pasan, en `PROJECT_CONTEXT.md` §14 la fila «Estilos» queda «comprobado en SDK 58». Si la 1 o la 3 fallan, se aplica el plan B de la tarea 3 (`StyleSheet` con el mismo tema); las pruebas no cambian.

La quinta comprueba las fechas en el motor de JavaScript del celular, que no es el de las pruebas: ahí solo se pudo simular. Si la fecha no sale, sale otro día o la app se cierra, hay que avisar antes de construir una pantalla con fechas.

### Lo que cambió respecto de este plan

**Antes de empezar**
- Se trabajó en la rama `fase-0` del mismo repositorio, no en una copia aparte.
- Los títulos pasaron de «Tarea N» a «Task N»: los scripts que ejecutan el plan solo reconocen esa palabra.

**Tarea 1**
- No se copiaron `.claude/settings.json`, `.vscode/`, `AGENTS.md` ni `LICENSE` de la plantilla. Lo útil de `AGENTS.md` está en `CLAUDE.md`.
- React quedó en 19.3.0, la versión que fija el SDK 58, y no en 19.3.1.
- Las dependencias de prueba se instalaron con `pnpm expo install … --dev`, y `tsconfig.json` lleva `"types": ["jest"]`.

**Tarea 2**
- La configuración del lint es `eslint.config.mjs` y `eslint/structure.mjs`, no `.js`: el proyecto es CommonJS y la configuración comprobada es ESM.
- `.prettierignore` también lista `docs/`, `.superpowers/` y `tools/lint-fixtures/`.

**Tarea 3**
- Los radios y las letras viven en `src/theme/scales.json`, y `css-vars.ts` arma los nombres de las variables. Una prueba amarra los colores, las letras y los radios de Tailwind al tema.
- `global.css` vive en `src/theme/`, no en la raíz.
- Archivos nuevos: `src/theme/theme-context.ts`, `types-env.d.ts` y `nativewind-env.d.ts` (este lo genera NativeWind).
- Nueva pieza en las reglas del lint: `asset`, la carpeta `assets/`. La pueden usar las pantallas, los componentes de un módulo y `components/ui`. Por eso los archivos de prueba del lint son 46 y no 44.
- Una imagen toma su tamaño de un `View` que la envuelve: en la web, sus clases perdían contra el tamaño real del archivo.
- `app.config.ts` lleva `web: { bundler: "metro" }`, que NativeWind pide para la versión web.

**Tarea 4**
- `errors.test.ts` tiene tres casos más (`constructor`, `toString` y un `P0001` sin mensaje), y los códigos se buscan en un `Map`.

**Tarea 5**
- `setupOnlineManager` también pregunta el estado de la red al arrancar: si la app abre sin señal, el aviso de cambio puede no llegar nunca.
- Nuevo `jest.setup.js`, que simula AsyncStorage en todas las pruebas.
- Las pruebas limpian sus clientes al terminar, y `renderWithProviders` usa `gcTime: Infinity` y tiene su propia prueba: sin eso, Jest no terminaba.

**Tarea 6**
- `pnpm test:scripts` corre `node --test "scripts/*.test.mjs"`. En Node 24, `node --test scripts/` toma la carpeta por un archivo y falla.
- Jest ignora `scripts/`: desde la versión 30 también recoge los `.test.mjs`.
- El generador tiene dos pruebas más: lo que devuelve y el código de salida por la terminal.
- Un módulo generado trae sus seis carpetas y dos archivos, sin los `.gitkeep` de la plantilla.

**Tarea 7**
- gitleaks no se instaló y los hooks no se activaron (ver «Lo que falta»).
- El CI usa `actions/checkout@v7`, `pnpm/action-setup@v6` y `actions/setup-node@v7`, con permiso solo de lectura, y comprueba la suma de la descarga de gitleaks.
- `CLAUDE.md` suma, en su sección 6, lo útil del `AGENTS.md` de Expo y lo aprendido en esta fase.

**Tarea 8**
- `@expo/ngrok` quedó instalado. El servidor de desarrollo se probó solo en local; la prueba en el celular sigue pendiente.
- `PROJECT_CONTEXT.md`: el árbol de carpetas (§9) refleja lo construido, y en §14 los montos van con `lib/money.ts`, sin Dinero.js, que se agrega si un reparto o un porcentaje lo pide.

## Después de la revisión final (2026-11-19)

Alguien que no había participado revisó la rama completa. No encontró nada que pierda datos ni que exponga una llave, pero sí puertas abiertas en lo que esta fase promete: que el orden lo cuide el lint y no la disciplina. Todo esto se corrigió, cada cosa con su prueba escrita primero.

**Las reglas de estructura**
- Valen para todo el código de `src`, también los archivos `.js`, `.jsx`, `.mjs` y `.cjs`.
- `assets` es solo la carpeta de la raíz, y de ella cuentan las imágenes y las letras; una carpeta `assets` dentro de `src` ya no tiene trato especial.
- Dentro de un módulo solo existen `index.ts`, `constants.ts` y las seis carpetas. Otro archivo u otra carpeta falla, igual que un `.test.ts` fuera de las carpetas conocidas.
- `index.ts` y `constants.ts` tienen cada uno sus permisos, los de la tabla de §9.1: `constants.ts` solo importa Zod, e `index.ts` publica components, hooks, queries, rules y schema de su módulo (ni `api` ni `constants.ts`, que la tabla no nombra).
- Cada lugar se reconoce desde la raíz del repositorio: una ruta repetida más adentro (`src/components/ui/src/features/x/api`) ya no recibe los permisos de la verdadera.
- `lib/supabase.ts` solo lo importan `api/` y su propia prueba. Otro archivo de `lib` ya no puede envolverlo ni volver a exportarlo.
- Paquetes: `rules/` no importa ninguno; `schema/` y `constants.ts`, solo Zod; `@supabase/*`, solo en `lib/supabase.ts` y en `api/`.
- Colores: Tailwind ya no trae su paleta (`bg-red-500`, `text-white`), solo los colores del tema, `transparent` y `current`. El lint atrapa además `#rgba`, `border-[color:…]` y un texto como `"red"` en una propiedad de color, y en el `index.ts` de un módulo valen las reglas de colores junto con la de `export *`.
- Un comentario ya no puede sacar código de la cobertura (`istanbul ignore`, `c8 ignore`, `v8 ignore`).

**La prueba de las reglas (`pnpm lint:rules`)**
- Compara, archivo por archivo, qué reglas saltan y cuántas veces. Cada archivo de prueba tiene una sola falta: antes, uno con dos faltas seguía pasando aunque se apagara una de sus reglas.
- Comprueba la tabla de `PROJECT_CONTEXT.md` §9.1 celda por celda (`scripts/lint-matrix.mjs`): cada fila importa todas las columnas, y el lint debe prohibir exactamente las que la tabla prohíbe.
- Se comprobó rompiendo la configuración a propósito: las nueve formas que el revisor encontró sin que nada avisara, las puertas de arriba vueltas a abrir, y cada política y cada regla quitada de una en una. En todos los casos `pnpm lint:rules` falla.

**Lo común de `lib`**
- Fechas: en el celular se calculan con el desfase fijo de Lima (UTC−5), sin depender de lo que su motor de JavaScript sepa de zonas horarias. Una prueba lo comprueba con un motor que falla al pedirle una zona, y otra avisa si ese desfase dejara de coincidir con `America/Lima`.
- `businessDayRange` solo acepta un día que existe, escrito `AAAA-MM-DD`. Antes, «2026-02-30» o «18-11-2026» daban el rango de otro día sin avisar.
- `errorMessage` e `isRetryable` reciben cualquier cosa y siempre responden. Antes, un error sin convertir dejaba el mensaje vacío.
- Sin señal, guardar falla al momento y avisa «Sin conexión». Antes quedaba en «Guardando…» y salía solo al volver la señal.
- Lo que se estaba guardando nunca se escribe en la caché del celular.
- La caché guardada lleva un número de esquema (`CACHE_SCHEMA`), guarda solo las consultas que cargaron bien y con menos de un día, y una consulta puede quedar fuera con `meta: { persist: false }`.
- `renderWithProviders` usa el cliente de la app: solo cambia los reintentos y el temporizador de la caché.
- Pruebas nuevas para lo que ninguna miraba: la hora de la tarde, el modo oscuro del celular, las variables de color de cada modo, la caché de verdad en el almacenamiento, el aviso de un error al guardar y la señal del celular.

**El repositorio**
- `.gitignore` deja fuera todo archivo `.env`, salvo `.env.example`, y la app apaga la copia de seguridad de Android (`allowBackup: false`).
- `pnpm typecheck` genera los tipos de las rutas antes de compilar (`expo customize tsconfig.json`): un enlace a una pantalla que no existe ahora falla también en una copia recién clonada y en GitHub. Antes, sin haber abierto `expo start`, compilaba.
- GitHub revisa además el formato de todos los archivos y el mensaje de cada commit que llega.
- La portada muestra la fecha de hoy, para que la prueba en el celular ejercite las fechas.

**Cómo quedan las comprobaciones**

| Comprobación | Resultado |
|---|---|
| `pnpm lint` | Sin errores ni avisos |
| `pnpm lint:rules` | 117 archivos de prueba y 717 celdas de la tabla: 20 filas por 36 columnas, sin las 3 en que un archivo se importaría a sí mismo |
| `pnpm typecheck` | Sin errores, con los tipos de las rutas generados |
| `pnpm test:coverage` | 139 pruebas; 100 % en `lib/{money,dates,errors}` y `theme/tokens` |
| `pnpm test:scripts` | 7 pruebas: el generador de módulos y `.gitignore` |
| Android | El paquete compila con la paleta nueva (2,539 módulos) |
| Estilos | En la versión web, los colores de la maqueta en claro y en oscuro, con Manrope y la fecha del día |

**Sobre NativeWind.** Su comprobación se apoya en tres cosas: el paquete de Android compila, la versión web se ve igual a la maqueta en claro y en oscuro, y la prueba en el celular, que sigue pendiente. Las pruebas de Jest no cuentan: ahí una clase no produce ningún estilo, así que ninguna puede mirar un color.
